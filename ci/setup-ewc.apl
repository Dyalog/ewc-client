⍝ APL commands fed to `dyalog +s -q` via stdin to bring up the EWC
⍝ demo server. Mirrors the local invocation:
⍝
⍝ The runner script (ci/run-server.sh) cats this file into
⍝ dyalog and then `sleep`s on the same pipe, so stdin stays open and
⍝ `demo.Run`'s wait loop (and the EWC Timer underneath it) keeps
⍝ cycling — events get drained instead of piling up on _EWC.TIMER1.
⍝
⍝ Mount layout (set up by the docker invocation):
⍝   /work/ewc              → the Dyalog/ewc repo
⍝   /work/ewc-client/dist  → freshly-built ewc-client (sibling of
⍝                            /work/ewc, so EWC.Init's auto-discovery
⍝                            picks it up)

]link.create /work/ewc/EWC
]link.create /work/ewc/demo
EWC.FOLDER←'/work/ewc'
1 demo.Run 'Browser'
