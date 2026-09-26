#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKFLOW="$ROOT/.github/workflows/ios.yml"
PLAN="$ROOT/ios/DrinkSaver.xctestplan"

ruby - "$WORKFLOW" "$PLAN" <<'RUBY'
require "yaml"
require "json"

workflow_path, plan_path = ARGV
workflow = YAML.load_file(workflow_path)
triggers = workflow["on"] || workflow[true] || {}
required_paths = ["ios/**", "docs/api-docs.yaml", "VERSION", ".github/workflows/ios.yml"]
%w[pull_request push].each do |event|
  paths = triggers.dig(event, "paths") || []
  missing = required_paths - paths
  abort "FAIL: #{event} path filter is missing #{missing.join(', ')}" unless missing.empty?
end
abort "FAIL: workflow permissions must be read-only" unless workflow["permissions"] == {"contents" => "read"}
abort "FAIL: concurrency must cancel superseded runs" unless workflow.dig("concurrency", "cancel-in-progress") == true

job = workflow.dig("jobs", "ios") || abort("FAIL: ios job is missing")
abort "FAIL: runner must be macos-15" unless job["runs-on"] == "macos-15"
steps = job["steps"]
checkout = steps.find { |step| step["uses"].to_s.start_with?("actions/checkout@") } || abort("FAIL: pinned checkout is missing")
abort "FAIL: checkout must be pinned to a full SHA" unless checkout["uses"].match?(/@\h{40}(?:\s|$)/)
abort "FAIL: checkout credentials must not persist" unless checkout.dig("with", "persist-credentials") == false
abort "FAIL: simulator preflight is missing" unless steps.any? { |step| step["run"].to_s.include?("create-pinned-simulator.sh") }
abort "FAIL: Xcode test plan is missing" unless steps.any? { |step| step["run"].to_s.include?("-testPlan DrinkSaver") }
abort "FAIL: Release fixture inspection is missing" unless steps.any? { |step| step["run"].to_s.include?("assert-release-has-no-fixtures.sh") }
artifact = steps.find { |step| step["uses"].to_s.start_with?("actions/upload-artifact@") } || abort("FAIL: failure artifact upload is missing")
abort "FAIL: upload-artifact must be pinned to a full SHA" unless artifact["uses"].match?(/@\h{40}(?:\s|$)/)
abort "FAIL: failure artifacts must be uploaded only after failure" unless artifact["if"] == "failure()"
plan = JSON.parse(File.read(plan_path))
targets = plan.fetch("testTargets")
unit_tests = targets.find { |entry| entry.dig("target", "name") == "DrinkSaverTests" } || abort("FAIL: unit test target is missing")
ui_tests = targets.find { |entry| entry.dig("target", "name") == "DrinkSaverUITests" } || abort("FAIL: UI test target is missing")
abort "FAIL: default DrinkSaver plan must remain the explicit smoke plan" unless
  unit_tests["selectedTests"] == ["ProjectSmokeTests/testRootViewInstantiates()"] &&
  ui_tests["selectedTests"] == ["ProjectSmokeUITests/testAppLaunches()"]
root = File.expand_path("..", File.dirname(plan_path))
scheme = File.read(File.join(root, "ios/DrinkSaver.xcodeproj/xcshareddata/xcschemes/DrinkSaver.xcscheme"))
{
  "LiveEnvironment" => ["DrinkSaverUITests", "LiveEnvironmentUITests/testLiveEnvironmentReadSaveUndoEditDeleteJourneyCleansUpCreatedRecords()"],
  "VisualCapture" => ["DrinkSaverUITests", "VisualCaptureUITests/testCaptureReferenceMatrix()"],
  "VisualParity" => ["DrinkSaverTests", "VisualParityTests/testFrozenReferenceMatrixIsCompleteAndComparable()"]
}.each do |name, (target_name, selected_test)|
  abort "FAIL: shared scheme must include #{name} test plan" unless scheme.include?("container:#{name}.xctestplan")
  supplemental = JSON.parse(File.read(File.join(File.dirname(plan_path), "#{name}.xctestplan")))
  target = supplemental.fetch("testTargets").find { |entry| entry.dig("target", "name") == target_name }
  abort "FAIL: #{name} plan must explicitly select #{selected_test}" unless target&.fetch("selectedTests", nil) == [selected_test]
end
live_script = File.read(File.join(root, "ios/scripts/run-live-tests.sh"))
capture_script = File.read(File.join(root, "ios/scripts/compare-reference-images.sh"))
abort "FAIL: live journey script must select the LiveEnvironment test plan" unless live_script.include?("-testPlan LiveEnvironment")
abort "FAIL: screenshot script must select VisualCapture and VisualParity plans" unless
  capture_script.include?("-testPlan VisualCapture") && capture_script.include?("-testPlan VisualParity")
puts "PASS: iOS workflow and test plan validated"
RUBY
