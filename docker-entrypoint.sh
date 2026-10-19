#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  ./node_modules/.bin/prisma migrate deploy
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
else
  exec node dist/main.js
fi
