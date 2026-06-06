{
  description = "RTA app-authoring platform development shell and local demos";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];

      forAllSystems =
        f:
        builtins.listToAttrs (
          map
            (system: {
              name = system;
              value = f system;
            })
            systems
        );
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.git
              pkgs.jq
              pkgs.nodejs_22
              pkgs.pnpm_9
            ];

            shellHook = ''
              echo "RTA dev shell: node $(node --version), pnpm $(pnpm --version)"
              echo "Try: pnpm demo:affine-monitor"
            '';
          };
        }
      );

      apps = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          runtimeInputs = [
            pkgs.git
            pkgs.nodejs_22
            pkgs.pnpm_9
          ];

          demoAffineMonitor = pkgs.writeShellApplication {
            name = "rta-demo-affine-monitor";
            inherit runtimeInputs;
            text = ''
              set -euo pipefail

              if [ ! -f package.json ] || [ ! -f pnpm-lock.yaml ]; then
                echo "Run this from the RTA repository root." >&2
                exit 1
              fi

              pnpm install --frozen-lockfile
              pnpm demo:affine-monitor
            '';
          };

          checkProduction = pkgs.writeShellApplication {
            name = "rta-check-production";
            inherit runtimeInputs;
            text = ''
              set -euo pipefail

              if [ ! -f package.json ] || [ ! -f pnpm-lock.yaml ]; then
                echo "Run this from the RTA repository root." >&2
                exit 1
              fi

              pnpm install --frozen-lockfile
              pnpm check:production
            '';
          };
        in
        {
          default = {
            type = "app";
            program = "${demoAffineMonitor}/bin/rta-demo-affine-monitor";
          };

          demo-affine-monitor = {
            type = "app";
            program = "${demoAffineMonitor}/bin/rta-demo-affine-monitor";
          };

          check-production = {
            type = "app";
            program = "${checkProduction}/bin/rta-check-production";
          };
        }
      );
    };
}
