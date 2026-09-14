 CBUpdateList args;e;view;sel;item;selok;Event
 ⍝ ⎕←args
 Event←⎕NS''
 e←Event.Event←⎕NS''
 e.(ID EventName Info)←(2↑args),⊂2↓args

⍝ item←3⊃args
 selok←'SelItems not OK'
 :Trap 6
     sel←'F1.LIST1'eWG'SelItems'
     :If item≡sel⍳1
         selok←'SelItems OK'
     :EndIf
 :Else
     ⎕←selok
     ⎕←'⍴sel=',,⍕⍴sel
 :EndTrap

⍝∘ (c) ISL  D WML AIM 23/01/2025 16:18  C0FCA5DC566EFD4BF66B1E5E936FBB72067A773B  DA
