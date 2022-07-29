<script type="ts">
	import getType from "./Piece.js";
    import { Chess } from "./chess";
	import { crossfade } from "svelte/transition";
	import { quintIn } from "svelte/easing";
    let chess = new Chess();
	chess.parseFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    export let debug = true;
	export let fen=""
	export let pgn=""
	let current_move = 0;
	let chessState 
	let livePieces
    $:{

		chessState = chess.parsePGN(pgn);
		livePieces = chess.pieces.filter(p=>!p.captured)
	} 

    const [send, receive] = crossfade({
		duration: (d) => Math.sqrt(d * 2000),

		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === "none" ? "" : style.transform;

			return {
				duration: 600,
				easing: quintIn,
				css: (t) => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`,
			};
		},
	});

    const cellColor = (row, col) => (row + 1 * col + 1) % 2 == 0 ? "white" : "lightgreen";

	const prev = async () => {
		if (current_move > 0) {
			current_move--;
		}
	};

	const  next = async () => {
		if (current_move < chessState.movePairs.length) {
			current_move++;
			console.log(chessState.movePairs[current_move])
			let moves = chessState.moves.filter(x=>x.pair_id===current_move)
			chess.performMoves(moves)
			chess.pieces = chess.pieces
		}
	};

</script>

<svg
			width="480"
			height="480"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			{#each chess.cells as cell, i (cell.id)}
				<g transform="translate({(i % 8) * 60},{Math.floor(i / 8) * 60})">
					<rect
						width="60"
						height="60"
						stroke="red"
						fill={cellColor(cell.row, cell.col)}
					/>
					{#if debug}
						<text x="10" y="10" fill="grey" font-family="monospace"
							>{cell.row},{cell.col}:{cell.id}</text
						>
					{/if}
					{#if cell.mark}
						<rect
							width="60"
							height="60"
							stroke="red"
							fill="yellow"
							opacity="0.3"
						/>
						<circle cx="30" cy="30" r="4" fill="lightgrey" />
					{/if}
				</g>
			{/each}

			{#each livePieces as piece, i (piece.cell_id)}
				<g
					in:receive={{ key: piece.cell_id }}
					out:send={{ key: piece.cell_id }}
					transform="translate({(piece.cell_id % 8) * 60 +
						10},{Math.floor(piece.cell_id / 8) * 60 + 4})"
				>
					{@html getType(piece.type)}
				</g>
			{/each}
		</svg>
		<div class="controls">
			<input bind:checked={debug} type="checkbox" id="debug" /><label for="debug">debug</label>
			<button on:click={() => prev()}> prev </button>
			{current_move} of {chessState.movePairs.length}
			<button on:click={() => next()}> next </button>
			<br/>
		</div>
<table>
	<tr>
		<td style="vertical-align:top;">
			<pre>
				{
					JSON.stringify(chessState.moves, null, 2) 
				}
			</pre>
		</td>
		<td style="vertical-align:top;">
			<pre>
				{
					JSON.stringify(chessState.movePairs, null, 2) 
				}
			</pre>
		</td>
	</tr>
</table>


