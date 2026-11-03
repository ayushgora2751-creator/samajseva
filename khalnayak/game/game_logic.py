"""
BINGO ARENA - Authoritative 5x5 Game Logic
Calculates rows, columns, and dual-diagonals for lines and B-I-N-G-O validation.
"""

import random
from typing import List, Dict, Any, Tuple


def generate_card() -> List[List[int]]:
    """
    Generates a randomized 5x5 card with numbers 1 to 25.
    Every number appears exactly once.
    """
    numbers = list(range(1, 26))
    random.shuffle(numbers)
    return [numbers[i * 5 : (i + 1) * 5] for i in range(5)]


def calculate_lines(card: List[List[int]], called_numbers: List[int]) -> Dict[str, Any]:
    """
    Evaluates a 5x5 card against called numbers.
    Checks 5 rows, 5 columns, 2 diagonals.
    Returns:
      - total_lines (int)
      - winning_cells (list of 'r,c' strings)
      - active_letters (list of chars from 'B','I','N','G','O')
      - is_bingo (bool, >= 5 lines)
    """
    if not card or len(card) != 5:
        return {'total_lines': 0, 'winning_cells': [], 'active_letters': [], 'is_bingo': False}

    called_set = set(called_numbers)
    completed_rows = []
    completed_cols = []
    completed_diags = []
    winning_cells = set()

    # Check 5 rows
    for r in range(5):
        if all(card[r][c] in called_set for c in range(5)):
            completed_rows.append(r)
            for c in range(5):
                winning_cells.add((r, c))

    # Check 5 columns
    for c in range(5):
        if all(card[r][c] in called_set for r in range(5)):
            completed_cols.append(c)
            for r in range(5):
                winning_cells.add((r, c))

    # Main diagonal: [0][0], [1][1], [2][2], [3][3], [4][4]
    if all(card[i][i] in called_set for i in range(5)):
        completed_diags.append('main')
        for i in range(5):
            winning_cells.add((i, i))

    # Anti diagonal: [0][4], [1][3], [2][2], [3][1], [4][0]
    if all(card[i][4 - i] in called_set for i in range(5)):
        completed_diags.append('anti')
        for i in range(5):
            winning_cells.add((i, 4 - i))

    total_lines = len(completed_rows) + len(completed_cols) + len(completed_diags)
    bingo_chars = ['B', 'I', 'N', 'G', 'O']
    active_letters = bingo_chars[: min(total_lines, 5)]

    return {
        'total_lines': total_lines,
        'completed_rows': completed_rows,
        'completed_cols': completed_cols,
        'completed_diags': completed_diags,
        'winning_cells': [f"{r},{c}" for r, c in winning_cells],
        'active_letters': active_letters,
        'is_bingo': total_lines >= 5,
    }
