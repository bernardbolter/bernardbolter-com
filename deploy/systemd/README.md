# Corpus nightly build — systemd

Units live in this directory. On Netcup they are installed as **user-level** units
for `bernard` (no root sudo required):

```bash
mkdir -p ~/.config/systemd/user
cp deploy/systemd/bernardbolter-corpus-build.service ~/.config/systemd/user/
cp deploy/systemd/bernardbolter-corpus-build.timer ~/.config/systemd/user/
# Drop User=/Group= from the service when running as a user unit
sed -i '/^User=/d;/^Group=/d' ~/.config/systemd/user/bernardbolter-corpus-build.service
loginctl enable-linger "$USER"
systemctl --user daemon-reload
systemctl --user enable --now bernardbolter-corpus-build.timer
systemctl --user list-timers | grep corpus
```

Schedule: **03:30 Europe/Berlin** daily.

Manual / emergency rebuild (same code path as the timer):

```bash
cd /home/bernard/apps/bernardbolter
npm run corpus:build
```

Writes `data/corpus/{corpus,briefing,build-report}.json` and mirrors to R2 under `corpus/`.
