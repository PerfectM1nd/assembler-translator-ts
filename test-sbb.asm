TEST2 SEGMENT
ORG 100H

SBB AX, BX
SBB DX, CX

SBB AX, 1
SBB DX, 255
SBB BX, 50h
SBB CX, 0

SBB CX, VAR1
SBB DX, VAR2

SBB VAR1, CX
SBB VAR2, DX

VAR1 DW 32H
VAR2 DW 8
END