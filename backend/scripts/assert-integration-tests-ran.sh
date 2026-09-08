#!/usr/bin/env bash
#
# Fails the build when a Testcontainers integration test did not actually run.
#
# The integration tests carry @Testcontainers(disabledWithoutDocker = true), which
# skips them rather than failing when no Docker daemon is present. That is right on a
# laptop and wrong in CI: a green build that silently ran no integration tests is
# worse than a red one.
#
# The class list is discovered from the source tree rather than hardcoded. The
# hardcoded version of this check named three classes while the suite had six, and
# assumed they all sat in one package, so half the integration tests were escaping the
# guard it was supposed to provide.
#
# Run from the backend directory, after mvn test or mvn verify.

set -euo pipefail

if [ ! -d src/test/java ]; then
    echo "::error::No src/test/java here. Run this from the backend directory."
    exit 1
fi

# Abstract classes are excluded: a base class holding the shared container produces no
# report of its own. Matched on the declaration rather than on an Abstract* filename,
# because a filename glob would also drop a real test that happened to be named that way.
classes=$(
    find src/test/java -name '*IntegrationTest.java' -print0 \
        | xargs -0 grep -LE 'abstract[[:space:]]+class' 2>/dev/null \
        | sed -e 's|^src/test/java/||' -e 's|/|.|g' -e 's|\.java$||' \
        | sort
)

if [ -z "$classes" ]; then
    echo "::error::Found no *IntegrationTest classes, so this guard is checking nothing."
    exit 1
fi

failed=0
count=0
while IFS= read -r class; do
    count=$((count + 1))
    report="target/surefire-reports/${class}.txt"

    if [ ! -f "$report" ]; then
        echo "::error::${class} produced no surefire report. Docker was probably unavailable and the tests skipped."
        failed=1
        continue
    fi

    if grep -qE 'Tests run: 0|Skipped: [1-9]' "$report"; then
        echo "::error::${class} ran no tests, or skipped some:"
        cat "$report"
        failed=1
    fi
done <<< "$classes"

if [ "$failed" -ne 0 ]; then
    exit 1
fi

echo "All ${count} integration test classes ran against a real Postgres."
