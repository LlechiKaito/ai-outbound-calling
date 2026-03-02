#!/bin/sh

if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
  echo "$GOOGLE_CREDENTIALS_JSON" > /tmp/google-credentials.json
  export GOOGLE_CREDENTIALS_PATH=/tmp/google-credentials.json
fi

exec "$@"
