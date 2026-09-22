import random

WIN_CONDITIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]          
]

def check_win(board, player):
    for a, b, c in WIN_CONDITIONS:
        if board[a] == board[b] == board[c] == player:
            return True
    return False

def check_draw(board):
    return ' ' not in board

def minimax(board, player, maximizing_player, depth=0):
    opponent = 'O' if player == 'X' else 'X'
    
    if check_win(board, player if maximizing_player else opponent):
        return 10 - depth if maximizing_player else -10 + depth
    elif check_win(board, opponent if maximizing_player else player):
        return -10 + depth if maximizing_player else 10 - depth
    elif check_draw(board):
        return 0
        
    empty_spots = [i for i, x in enumerate(board) if x == ' ']
    
    if maximizing_player:
        max_eval = -float('inf')
        for spot in empty_spots:
            board[spot] = player
            eval_score = minimax(board, player, False, depth + 1)
            board[spot] = ' '
            max_eval = max(max_eval, eval_score)
        return max_eval
    else:
        min_eval = float('inf')
        for spot in empty_spots:
            board[spot] = opponent
            eval_score = minimax(board, player, True, depth + 1)
            board[spot] = ' '
            min_eval = min(min_eval, eval_score)
        return min_eval

def get_best_move(board, player):
    empty_spots = [i for i, x in enumerate(board) if x == ' ']
    best_score = -float('inf')
    best_moves = []
    
    for spot in empty_spots:
        board[spot] = player
        score = minimax(board, player, False, 0)
        board[spot] = ' '
        
        if score > best_score:
            best_score = score
            best_moves = [spot]
        elif score == best_score:
            best_moves.append(spot)
            
    return random.choice(best_moves)

def print_board(board):
    print(f" {board[0]} | {board[1]} | {board[2]} ")
    print("---+---+---")
    print(f" {board[3]} | {board[4]} | {board[5]} ")
    print("---+---+---")
    print(f" {board[6]} | {board[7]} | {board[8]} ")
    print()

def simulate_games(n_games, verbose=False):
    x_wins = 0
    o_wins = 0
    draws = 0
    
    if n_games > 1:
        print(f"Запуск симуляции: {n_games} игр 'Minimax против Minimax'...\n")
    
    for i in range(n_games):
        board = [' '] * 9
        current_player = 'X'
        
        if verbose:
            print(f"--- ДЕМОНСТРАЦИОННАЯ ИГРА ---")
            
        while True:
            move = get_best_move(board, current_player)
            board[move] = current_player
            
            if verbose:
                print(f"Игрок '{current_player}' делает ход в позицию {move}:")
                print_board(board)
                
            if check_win(board, current_player):
                if current_player == 'X':
                    x_wins += 1
                else:
                    o_wins += 1
                break
            elif check_draw(board):
                draws += 1
                break
                
            current_player = 'O' if current_player == 'X' else 'X'
            
    print("=== РЕЗУЛЬТАТЫ СИМУЛЯЦИИ ===")
    print(f"Всего сыграно: {n_games}")
    print(f"Побед 'X':     {x_wins}")
    print(f"Побед 'O':     {o_wins}")
    print(f"Ничьих:        {draws}")
    print("============================\n")

if __name__ == "__main__":
    # 1. Показываем одну подробную игру шаг за шагом
    simulate_games(1, verbose=True)
    
    # 2. Собираем статистику на 100 играх
    simulate_games(100, verbose=False)
