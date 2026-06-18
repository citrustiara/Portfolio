class AlphaBetaAgent {
    constructor(my_token = 'x', depth = 7) {
        this.my_token = my_token;
        this.depth = depth;
        this.nodes_visited = 0;
    }

    async decide(connect4) {
        this.nodes_visited = 0;

        if (connect4.who_moves !== this.my_token) {
            throw new AgentException('not my round');
        }

        const moves = connect4.possible_drops();
        if (!moves || moves.length === 0) return null;

        // standard alphabeta search over all possible moves.
        let best_score = -Infinity;
        let best_moves = [];
        let alpha = -Infinity;
        let beta = Infinity;

        // Sort moves by center proximity for better alpha-beta pruning efficiency
        // (heuristic: center moves are often better)
        const center = Math.floor(connect4.width / 2);
        moves.sort((a, b) => Math.abs(center - a) - Math.abs(center - b));

        for (const move of moves) {
            const newState = connect4.simulate_move(move);
            const score = await this.alphabeta(newState, this.depth - 1, alpha, beta);
            if (score > best_score) {
                best_score = score;
                best_moves = [move];
                alpha = Math.max(alpha, best_score);
            } else if (score === best_score) {
                best_moves.push(move);
            }
        }

        console.log(`Nodes visited: ${this.nodes_visited}`);

        // If multiple moves have the same best score, we already sorted them by center proximity
        // so we can just pick the first one, or re-sort if we want to be explicit.
        // The initial sort helps pruning, but let's explicitely sort the candidates again to be sure
        // we pick the most central one among the best scores.
        best_moves.sort((a, b) => Math.abs(center - a) - Math.abs(center - b));
        return best_moves[0];
    }

    async alphabeta(connect4, depth, alpha, beta) {
        this.nodes_visited++;
        // terminal or depth 
        if (depth === 0 || connect4.game_over) {
            return this.evaluate(connect4);
        }

        // Derive role from the position
        const is_maximizing = (connect4.who_moves === this.my_token);

        if (is_maximizing) {
            let value = -Infinity;
            for (const move of connect4.possible_drops()) {
                const child = connect4.simulate_move(move);
                value = Math.max(value, await this.alphabeta(child, depth - 1, alpha, beta));
                alpha = Math.max(alpha, value);
                if (alpha >= beta) break; // beta cut-off
            }
            return value;
        } else {
            let value = Infinity;
            for (const move of connect4.possible_drops()) {
                const child = connect4.simulate_move(move);
                value = Math.min(value, await this.alphabeta(child, depth - 1, alpha, beta));
                beta = Math.min(beta, value);
                if (alpha >= beta) break; // alpha cut-off
            }
            return value;
        }
    }

    evaluate(connect4) {
        const opp = this.get_opponent_token();

        // Terminal flags if connect4 provides them:
        if (connect4.wins === this.my_token) return Infinity;
        if (connect4.wins === opp) return -Infinity;

        // Fallback: check windows for a 4-in-row even if connect4.wins wasn't set
        for (const four of connect4.iter_fours()) {
            const my_count = four.filter(c => c === this.my_token).length;
            const opp_count = four.filter(c => c === opp).length;
            if (my_count === 4) return Infinity;
            if (opp_count === 4) return -Infinity;
        }

        let score = 0;

        // center control
        const centerCol = Math.floor(connect4.width / 2);
        const centerCount = connect4.board.map(row => row[centerCol])
            .filter(cell => cell === this.my_token).length;
        score += centerCount * 6;

        // window heuristics
        for (const four of connect4.iter_fours()) {
            score += this._score_window(four, this.my_token, opp);
        }

        return score;
    }

    _score_window(window, me, opp) {
        const my_count = window.filter(c => c === me).length;
        const opp_count = window.filter(c => c === opp).length;
        // be permissive about what counts as empty
        const empty = window.filter(c => c === '_' || c === '.' || c === null || c === undefined).length;

        if (my_count === 3 && empty === 1) return 5000;
        if (my_count === 2 && empty === 2) return 200;

        if (opp_count === 3 && empty === 1) return -5000;
        if (opp_count === 2 && empty === 2) return -200;

        return 0;
    }

    get_opponent_token() {
        return this.my_token === 'o' ? 'x' : 'o';
    }
}
