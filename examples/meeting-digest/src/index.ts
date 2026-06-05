import { Effect, Schema } from "effect"
import {
  type Command,
  ContextFactory,
  DomainError,
  defineCommand,
  type OperationScope,
  type UnitOfWork,
} from "@rta/core"
import {
  InstrumentedCommandHandler,
  InstrumentedOutboundAdapter,
  createReadableLogBuffer,
  type OperationSummary,
  type ReadableLogVerbosity,
} from "@rta/strict"

export const DigestMeeting = defineCommand(
  "DigestMeeting",
  Schema.Struct({
    meetingId: Schema.NonEmptyString,
    transcript: Schema.NonEmptyString,
  }),
)

export type DigestMeetingCommand = Command<
  "DigestMeeting",
  {
    readonly meetingId: string
    readonly transcript: string
  }
>

export type WorkKind = "feature" | "automation" | "research"

export interface TopicDigest {
  readonly title: string
  readonly salientPoints: ReadonlyArray<string>
}

export interface ExtractedWorkItem {
  readonly title: string
  readonly kind: WorkKind
  readonly goal: string
  readonly users: ReadonlyArray<string>
  readonly systems: ReadonlyArray<string>
  readonly largerSystem?: string
  readonly sourceTopic: string
  readonly confidence: "low" | "medium" | "high"
}

export interface MeetingDigest {
  readonly meetingId: string
  readonly topics: ReadonlyArray<TopicDigest>
  readonly workItems: ReadonlyArray<ExtractedWorkItem>
  readonly review: {
    readonly status: "needs-review"
    readonly reason: string
  }
  readonly publication: {
    readonly mode: "dry-run"
    readonly targets: ReadonlyArray<"AFFiNE" | "Plane" | "GitHub">
  }
}

export interface MeetingDigestArtifact {
  readonly type: "MeetingDigestCreated"
  readonly digest: MeetingDigest
}

export class DryRunPublicationAdapter extends InstrumentedOutboundAdapter<
  { readonly digest: MeetingDigest },
  { readonly stagedTargets: ReadonlyArray<"AFFiNE" | "Plane" | "GitHub"> }
> {
  constructor() {
    super("DryRunPublicationAdapter", "MeetingDigest")
  }

  protected summarize(input: { readonly digest: MeetingDigest }): OperationSummary {
    return {
      action: `Stage dry-run publication ${input.digest.meetingId}`,
      reason: "external writes require human review before commit",
      with: input.digest.publication.targets,
      input: `${input.digest.topics.length} topics and ${input.digest.workItems.length} work items`,
      output: "publication targets staged without external writes",
      lineage: [
        "fixture:meeting-digest",
        "primitive:outbound-adapter",
        "policy:review-before-external-write",
      ],
      boundary: {
        system: "AFFiNE/Plane/GitHub",
        operation: "publish-digest-dry-run",
        mode: "dry-run",
        reviewRequired: true,
      },
    }
  }

  protected execute(
    input: { readonly digest: MeetingDigest },
  ): Effect.Effect<{ readonly stagedTargets: ReadonlyArray<"AFFiNE" | "Plane" | "GitHub"> }, DomainError> {
    return Effect.succeed({ stagedTargets: input.digest.publication.targets })
  }
}

export class DigestMeetingHandler extends InstrumentedCommandHandler<DigestMeetingCommand> {
  constructor() {
    super("DigestMeetingHandler", "MeetingDigest")
  }

  protected summarizeCommand(command: DigestMeetingCommand): OperationSummary {
    return {
      action: `Digest ${command.payload.meetingId}`,
      reason: "the transcript is ready for topic and work-item extraction",
      with: ["topics", "work items", "human review"],
      input: `${command.payload.transcript.length} transcript chars`,
      output: "MeetingDigestCreated event staged",
    }
  }

  protected executeCommand(
    command: DigestMeetingCommand,
    scope: OperationScope,
  ): Effect.Effect<void, DomainError> {
    return scope.requireCommit().pipe(
      Effect.flatMap(() => {
        const digest = createMeetingDigest(command.payload.meetingId, command.payload.transcript)
        const artifact: MeetingDigestArtifact = {
          type: "MeetingDigestCreated",
          digest,
        }
        return new DryRunPublicationAdapter().invoke({ digest }, scope).pipe(
          Effect.flatMap(() =>
            scope.unitOfWork?.stageEvent?.(artifact, {
              message: "meeting digest created for human review",
              code: "meeting-digest.created",
            }) ?? Effect.void,
          ),
        )
      }),
    )
  }
}

export const createMeetingDigest = (meetingId: string, transcript: string): MeetingDigest => {
  const topics = extractTopics(transcript)
  return {
    meetingId,
    topics,
    workItems: topics.flatMap((topic) => extractWorkItems(topic)),
    review: {
      status: "needs-review",
      reason: "external publication requires human QA/demo review",
    },
    publication: {
      mode: "dry-run",
      targets: ["AFFiNE", "Plane", "GitHub"],
    },
  }
}

export const runMeetingDigestScenario = async (
  transcript: string,
  options: { readonly verbosity?: ReadableLogVerbosity } = {},
): Promise<{
  readonly digest: MeetingDigest
  readonly logLines: ReadonlyArray<string>
}> => {
  let digest: MeetingDigest | undefined
  const unitOfWork: UnitOfWork = {
    commit: () => Effect.void,
    stageEvent: (event) =>
      Effect.sync(() => {
        if (isMeetingDigestArtifact(event)) {
          digest = event.digest
        }
      }),
  }

  const logs = createReadableLogBuffer({ verbosity: options.verbosity ?? "normal" })
  const command = await Effect.runPromise(DigestMeeting.make({
    meetingId: "meeting-1",
    transcript,
  }))
  const external = new ContextFactory(undefined, fixedRandom()).createExternal({
    actorId: "codex",
    displayName: "Codex",
  })
  const scope = external
    .promote("internal", { message: "scenario input validated" })
    .promote("command", { message: "scenario command execution" })
    .withUnitOfWork(unitOfWork)

  await Effect.runPromise(new DigestMeetingHandler().handle(command, scope))
  logs.stop()

  if (digest === undefined) {
    throw new Error("meeting digest scenario did not produce a digest")
  }

  return {
    digest,
    logLines: logs.entries.map((entry) => entry.line),
  }
}

const extractTopics = (transcript: string): ReadonlyArray<TopicDigest> => {
  const lines = transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const topicLines = lines.filter((line) => /^topic:/i.test(line))
  if (topicLines.length === 0) {
    return [{
      title: "Meeting Discussion",
      salientPoints: lines.slice(0, 8),
    }]
  }

  return topicLines.map((topicLine, index) => {
    const title = topicLine.replace(/^topic:\s*/i, "")
    const nextTopic = topicLines[index + 1]
    const start = lines.indexOf(topicLine) + 1
    const end = nextTopic === undefined ? lines.length : lines.indexOf(nextTopic)
    return {
      title,
      salientPoints: lines.slice(start, end).filter((line) => !/^topic:/i.test(line)),
    }
  })
}

const extractWorkItems = (topic: TopicDigest): ReadonlyArray<ExtractedWorkItem> =>
  topic.salientPoints
    .filter((point) => /\b(build|automate|research|integrate|generate|extract|publish|sync|scheduler|queue)\b/i.test(point))
    .map((point) => ({
      title: titleFromPoint(point),
      kind: classifyWork(point),
      goal: point,
      users: inferUsers(point),
      systems: inferSystems(point),
      largerSystem: inferLargerSystem(point, topic.title),
      sourceTopic: topic.title,
      confidence: "medium",
    }))

const classifyWork = (point: string): WorkKind => {
  if (/\bautomate|scheduler|queue|sync|publish|extract\b/i.test(point)) return "automation"
  if (/\bresearch|compare|investigate|evaluate\b/i.test(point)) return "research"
  return "feature"
}

const inferUsers = (point: string): ReadonlyArray<string> =>
  /\bagent|codex\b/i.test(point)
    ? ["Codex/agent operator", "Virgil"]
    : ["Virgil"]

const inferSystems = (point: string): ReadonlyArray<string> => {
  const systems = [
    ["AFFiNE", /\baffine\b/i],
    ["Plane", /\bplane\b/i],
    ["GitHub", /\bgithub\b/i],
    ["Otter", /\botter\b/i],
    ["RTA", /\brta\b/i],
    ["Grafana", /\bgrafana\b/i],
  ] as const
  const found = systems.filter(([, pattern]) => pattern.test(point)).map(([name]) => name)
  return found.length > 0 ? found : ["RTA"]
}

const inferLargerSystem = (point: string, topicTitle: string): string | undefined =>
  /\brta|pipeline|flow|digest\b/i.test(`${topicTitle} ${point}`)
    ? "RTA-authored workflow app"
    : undefined

const titleFromPoint = (point: string): string =>
  point
    .replace(/^[*-]\s*/, "")
    .split(/[.!?]/)[0]
    .slice(0, 90)

const isMeetingDigestArtifact = (event: unknown): event is MeetingDigestArtifact =>
  typeof event === "object" &&
  event !== null &&
  (event as { type?: unknown }).type === "MeetingDigestCreated"

const fixedRandom = () => {
  let index = 0
  return {
    uuid: () => {
      index += 1
      return `meeting-digest-id-${index}`
    },
  }
}
