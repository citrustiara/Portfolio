class GameplayException extends Error {}
class AgentException extends Error {}

class Connect4 {
    constructor(width = 7, height = 6) {
        this.width = width;
        this.height = height;
        this.who_moves = 'o';
        this.game_over = false;
        this.wins = null;
        this.board = [];
        for (let n_row = 0; n_row < this.height; n_row++) {
            this.board.push(new Array(this.width).fill('_'));
        }
    }

    possible_drops() {
        return Array.from({length: this.width}, (_, i) => i)
            .filter(col => this.board[0][col] === '_');
    }

    drop_token(n_column) {
        if (this.game_over) {
            throw new GameplayException('game over');
        }
        if (!this.possible_drops().includes(n_column)) {
            throw new GameplayException('invalid move');
        }

        let n_row = 0;
        while (n_row + 1 < this.height && this.board[n_row + 1][n_column] === '_') {
            n_row++;
        }
        this.board[n_row][n_column] = this.who_moves;
        this.game_over = this._check_game_over();
        this.who_moves = this.who_moves === 'o' ? 'x' : 'o';
    }

    center_column() {
        const centerCol = Math.floor(this.width / 2);
        return this.board.map(row => row[centerCol]);
    }

    *iter_fours() {
        // horizontal
        for (let n_row = 0; n_row < this.height; n_row++) {
            for (let start_column = 0; start_column <= this.width - 4; start_column++) {
                yield this.board[n_row].slice(start_column, start_column + 4);
            }
        }

        // vertical
        for (let n_column = 0; n_column < this.width; n_column++) {
            for (let start_row = 0; start_row <= this.height - 4; start_row++) {
                const four = [];
                for (let i = 0; i < 4; i++) {
                    four.push(this.board[start_row + i][n_column]);
                }
                yield four;
            }
        }

        // diagonal
        for (let n_row = 0; n_row <= this.height - 4; n_row++) {
            for (let n_column = 0; n_column <= this.width - 4; n_column++) {
                const four1 = [];
                const four2 = [];
                for (let i = 0; i < 4; i++) {
                    four1.push(this.board[n_row + i][n_column + i]);
                    four2.push(this.board[n_row + i][this.width - 1 - n_column - i]);
                }
                yield four1;
                yield four2;
            }
        }
    }

    _check_game_over() {
        if (this.possible_drops().length === 0) {
            this.wins = null;
            return true;
        }

        for (const four of this.iter_fours()) {
            if (four.every(cell => cell === 'o')) {
                this.wins = 'o';
                return true;
            } else if (four.every(cell => cell === 'x')) {
                this.wins = 'x';
                return true;
            }
        }
        return false;
    }

    simulate_move(column) {
        const new_connect4 = new Connect4(this.width, this.height);
        new_connect4.board = this.board.map(row => [...row]);
        new_connect4.who_moves = this.who_moves;
        new_connect4.game_over = this.game_over;
        new_connect4.wins = this.wins;
        new_connect4.drop_token(column);
        return new_connect4;
    }
}