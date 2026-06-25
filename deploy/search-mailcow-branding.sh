#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized

grep -RInE 'mailcow|Version:|2026-05c|moo|dockerized|github.com/mailcow' data/web 2>/dev/null | head -240
