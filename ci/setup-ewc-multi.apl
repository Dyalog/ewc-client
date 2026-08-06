⍝ APL commands fed to `dyalog +s -q` via stdin to bring up EWC in MULTI
⍝ mode for the multi-session Playwright suite (e2e/multi/).
⍝
⍝ Counterpart of ci/setup-ewc.apl, which starts Browser mode on :22322.
⍝ This one starts Multi mode on :22323, so both servers can run side by
⍝ side without either disturbing the other.
⍝
⍝ The runner script (ci/run-server.sh, invoked with
⍝ SETUP_APL=/scripts/setup-ewc-multi.apl) cats this file into dyalog and
⍝ then `sleep`s on the same pipe so stdin stays open. That matters more
⍝ here than in Browser mode: EWC.Init returns immediately under Multi, so
⍝ without the held-open stdin dyalog would read EOF and exit before any
⍝ browser ever connected.
⍝
⍝ Mount layout (set up by ci/ewc-multi-start.sh / the CI job):
⍝   /work/ewc              → the Dyalog/ewc repo
⍝   /work/ewc-client/dist  → freshly-built ewc-client (sibling of
⍝                            /work/ewc, so EWC.Init's auto-discovery
⍝                            picks it up)
⍝   /work/mtest            → e2e/multi/apl/mtest from THIS repo, so the
⍝                            test app versions in lockstep with the specs
⍝                            that assert against it

]link.create /work/ewc/EWC
]link.create /work/mtest
EWC.FOLDER←'/work/ewc'
mtest.Run
