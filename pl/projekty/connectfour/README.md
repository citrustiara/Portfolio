# Multi Connect 4

A challenging browser-based Connect 4 game where you play simultaneously on four boards against an AI opponent using the Alpha-Beta pruning algorithm.

**Play online:** [multiconnect4.pages.dev](https://multiconnect4.pages.dev)

## About

Multi Connect 4 puts a unique twist on the classic Connect 4 game. Instead of playing on a single board, you must manage four simultaneous games against an AI opponent. The catch? You lose immediately if the AI wins on ANY board, but you only win if you complete all four boards without losing.

This creates a strategic challenge where you must balance offense and defense across multiple boards while the AI uses advanced decision-making algorithms.

## Features

- **Four Simultaneous Games**: Manage multiple Connect 4 boards at once
- **AI Opponent**: Powered by Alpha-Beta pruning with minimax algorithm
- **Keyboard Controls**: Press keys 1-7 to quickly drop tokens on the active board
- **Visual Feedback**: Clear indication of which board is active and game status
- **Responsive Design**: Works on desktop and mobile devices
- **Instant Loss Condition**: Keeps you on your toes - one mistake costs everything

## How to Play

1. You play as red (O), the AI plays as yellow (X)
2. The active board is highlighted with a green border
3. Click column buttons or press keys 1-7 to drop your token
4. After your move, the AI responds automatically
5. The game cycles to the next active board after each turn
6. **Win Condition**: Complete all four boards (win or tie) without losing any
7. **Loss Condition**: AI wins on ANY single board

## Technology

Built with vanilla JavaScript, this project demonstrates:

- **Alpha-Beta Pruning**: Efficient game tree search algorithm
- **Minimax Algorithm**: Optimal decision-making for two-player games
- **Heuristic Evaluation**: Position scoring based on potential winning patterns
- **Clean Architecture**: Separation between game logic, AI, and UI

## Project Structure

```
├── index.html              # Main HTML structure
├── styles.css              # Styling and animations
├── connect4.js             # Core game logic and rules
├── alphabeta-agent.js      # AI implementation
└── multi-game-ui.js        # User interface and game management
```

## Key Components

### Connect4 Class
Handles game state, move validation, and win detection. Includes:
- Board representation and manipulation
- Move simulation for AI planning
- Win condition checking across all directions
- Iterator for evaluating four-in-a-row patterns

### AlphaBetaAgent Class
Implements the AI opponent with:
- Alpha-Beta pruning for efficient search
- Configurable search depth
- Position evaluation heuristics
- Center column preference for tie-breaking

### Game Evaluation
The AI evaluates positions based on:
- Terminal states (wins/losses)
- Center column control
- Potential winning patterns (3-in-a-row, 2-in-a-row)
- Defensive blocking of opponent threats

## Local Development

Clone the repository and open `index.html` in a web browser

No build process or dependencies required.

## Configuration

You can adjust the AI difficulty by modifying the depth parameter in `multi-game-ui.js`:

```javascript
agents.push(new AlphaBetaAgent('x', 5));  // Current depth: 5
```

Higher depth values make the AI stronger but slower. Depth 5 provides a good balance.

## Author

**Maciej Łukasiewicz**

## License

This project is open source and available under the MIT License.

## Acknowledgments

Connect 4 (also known as Four in a Row) is a classic two-player connection game. This implementation adds a multi-board twist and features an AI opponent using classic game theory algorithms.
