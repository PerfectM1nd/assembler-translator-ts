TEST1 SEGMENT
ORG 100H

NEXT:
MOV DX, 1
MOV AX, 0
MOV BX, 0
MOV CX, 1
SBB DX, BX

JA NEXT

MOV AX, 150
MOV BX, 250
MUL BX

END