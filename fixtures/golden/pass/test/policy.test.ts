// Golden fixture policy mentions used by the current test-policy command.
// Rules
// SlotMustBeOpen
// SlotNotAlreadyBooked
// InvoiceAmountMustBePositive
// SlotNotOpen
// SlotAlreadyBooked
// InvoiceAmountInvalid

// Decisions
// SlotLifecycleDecision
// InvoiceRiskBandDecision
// InvoiceChannelDecision
// open
// booked
// released
// Low
// Medium
// High
// Email
// Sms
// Manual

// Reactions
// CreateInvoiceOnSlotBooked
// ReleaseSlotOnInvoiceFailed

// Process managers
// BookingFlowManager

// Obligation markers
// @rta-obligation rule:Billing.Invoice.InvoiceAmountMustBePositive:pass-case
// @rta-obligation rule:Billing.Invoice.InvoiceAmountMustBePositive:fail-case
// @rta-obligation rule:Scheduling.Slot.SlotMustBeOpen:pass-case
// @rta-obligation rule:Scheduling.Slot.SlotMustBeOpen:fail-case
// @rta-obligation rule:Scheduling.Slot.SlotMustBeOpen:valid-pre-state
// @rta-obligation rule:Scheduling.Slot.SlotMustBeOpen:wrong-state
// @rta-obligation rule:Scheduling.Slot.SlotNotAlreadyBooked:pass-case
// @rta-obligation rule:Scheduling.Slot.SlotNotAlreadyBooked:fail-case
// @rta-obligation rule:Scheduling.Slot.SlotNotAlreadyBooked:unclaimed
// @rta-obligation rule:Scheduling.Slot.SlotNotAlreadyBooked:already-claimed
// @rta-obligation decision:Billing.InvoiceRiskBandDecision:outcome:Low
// @rta-obligation decision:Billing.InvoiceRiskBandDecision:outcome:Medium
// @rta-obligation decision:Billing.InvoiceRiskBandDecision:outcome:High
// @rta-obligation decision:Billing.InvoiceRiskBandDecision:bucket-boundaries
// @rta-obligation decision:Billing.InvoiceRiskBandDecision:bucket-exhaustiveness
// @rta-obligation decision:Billing.InvoiceChannelDecision:outcome:Email
// @rta-obligation decision:Billing.InvoiceChannelDecision:outcome:Sms
// @rta-obligation decision:Billing.InvoiceChannelDecision:outcome:Manual
// @rta-obligation decision:Billing.InvoiceChannelDecision:known-key-routing
// @rta-obligation decision:Billing.InvoiceChannelDecision:fallback-routing
// @rta-obligation decision:Scheduling.SlotLifecycleDecision:outcome:open
// @rta-obligation decision:Scheduling.SlotLifecycleDecision:outcome:booked
// @rta-obligation decision:Scheduling.SlotLifecycleDecision:outcome:released
// @rta-obligation decision:Scheduling.SlotLifecycleDecision:first-match-ordering
// @rta-obligation decision:Scheduling.SlotLifecycleDecision:fallback-outcome
// @rta-obligation decision:Scheduling.SlotLifecycleDecision:representative-progression
// @rta-obligation reaction:Billing.CreateInvoiceOnSlotBooked:trigger-handled
// @rta-obligation reaction:Billing.CreateInvoiceOnSlotBooked:emit:CreateInvoice:to:Billing
// @rta-obligation reaction:Billing.ReleaseSlotOnInvoiceFailed:trigger-handled
// @rta-obligation reaction:Billing.ReleaseSlotOnInvoiceFailed:emit:ReleaseSlot:to:Scheduling
// @rta-obligation process-manager:Scheduling.BookingFlowManager:trigger-starts-instance
// @rta-obligation process-manager:Scheduling.BookingFlowManager:transition:InvoiceCreated
// @rta-obligation process-manager:Scheduling.BookingFlowManager:transition:InvoiceFailed
// @rta-obligation process-manager:Scheduling.BookingFlowManager:emit:InvoiceFailed:ReleaseSlot
// @rta-obligation process-manager:Scheduling.BookingFlowManager:terminal:InvoiceFailed
// @rta-obligation process-manager:Scheduling.BookingFlowManager:linear-progression
