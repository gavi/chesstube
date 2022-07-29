interface MovePair {
	id: number | undefined;
	white: string | undefined;
	black: string | undefined;
	inlinedesc: string | undefined;
	desc: string | undefined;
}

interface Move {
	id: number;
	pair_id: number;
	source: number;
	destination: number;
	isWhite: boolean;
	isCheck: boolean;
	isCapture: boolean;
	isCheckMate: boolean;
	isEnPassant: boolean;
	isPromotion: boolean;
	promotedTo: string;
}

interface Cell {
	id: number;
	row: number;
	col: number;
	piece: string | undefined;
	mark: boolean;
	captured: boolean;
}

interface Piece {
	id: number;
	type: string;
	cell_id: number; // the number pointer to the cell
	captured: boolean;
}

interface Location {
	row: number;
	col: number;
}

interface ChessState {
	moves: Move[];
	movePairs: MovePair[];
}

export class Chess {
	pieces: Piece[] = [];
	movePairs: MovePair[] = [];
	cells: Cell[] = [];
	moves: Move[] = [];

	constructor() {
		let count = 0;
		for (let i = 0; i < 8; i++) {
			for (let j = 0; j < 8; j++) {
				this.cells.push({
					id: count,
					row: i,
					col: j,
					piece: undefined,
					mark: false,
					captured: false
				});
				count = count + 1;
			}
		}
	}

	parseFEN(fen: string) {
		//Initializes the board with a state
		this.pieces = [];
		let count = 0;
		for (let i = 0; i < fen.length; i++) {
			if (fen.charAt(i) === ' ') {
				break;
			} else if (fen.charAt(i) === '/') {
				//Next row
			} else if (!isNaN(Number(fen.charAt(i)))) {
				count = count + Number(fen.charAt(i));
			} else {
				this.pieces.push({ id: count, type: fen.charAt(i), cell_id: count, captured: false });
				count = count + 1;
			}
		}
	}

	getFEN(): string {
		//Gets FEN Representaion
		let fen = '';
		let emptyCount = 0;
		for (let i = 0; i < 8; i++) {
			for (let j = 0; j < 8; j++) {
				const piece = this.pieces.find((p) => p.cell_id == i * 8 + j);
				if (piece != null) {
					if (emptyCount > 0) {
						fen += emptyCount;
					}
					fen += piece.type;
					emptyCount = 0;
				} else {
					emptyCount++;
				}
			}
			if (emptyCount > 0) {
				fen += emptyCount;
				emptyCount = 0;
			}
			if (i < 7) {
				fen += '/';
			}
		}
		if (emptyCount > 0) {
			fen += emptyCount;
		}
		return fen + ' w KQkq - 0 1';
	}

	printState() {
		let str: string = '';
		for (let i = 0; i < 8; i++) {
			for (let j = 0; j < 8; j++) {
				str += this.pieces.find((p) => !p.captured && p.cell_id === i * 8 + j)?.type ?? '.';
			}
			str += '\n';
		}
		console.log(this.getFEN());
		console.log(str);
	}

	parsePGN(pgn: string): ChessState {
		let chess = new Chess();
		chess.parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
		//This regex cleansup
		const regexMain =
			/(?<tag>\[Event[\s\S]*?\])\n\n(?<moves>[0-9]+\.[\s\S]*?\s)(?<result>(1-0|0-1|1\/2-1\/2))/gm;
		const regex =
			/(?<move>[0-9]+)\.\s?(?<white>[\w\+\-=]+)\s(?<inlinedesc>\{[\s\S]*?\}\s([0-9]+\.+))?\s?(?<black>[\w\+\-=]+)?(?<desc>\{[\s\S]*?\})?/gm;
		for (const mm of pgn.matchAll(regexMain)) {
			chess.movePairs = [];
			for (const match of mm.groups.moves.matchAll(regex)) {
				chess.movePairs.push({
					id: parseInt(match?.groups?.move === undefined ? '0' : match?.groups?.move),
					white: match?.groups?.white,
					black: match?.groups?.black,
					inlinedesc: match?.groups?.inlinedesc,
					desc: match?.groups?.desc
				});
			}
			chess.loadMoves();
		}

		return { moves: chess.moves, movePairs: chess.movePairs };
	}

	performMoves(moves: Move[]) {
		moves.forEach((m) => {
			let destination = this.pieces.find((p) => p.cell_id === m.destination);
			if (destination != null) {
				destination.cell_id = -1;
				destination.captured = true;
			}
			let source = this.pieces.find((p) => p.cell_id === m.source);
			if (source != null) {
				source.cell_id = m.destination;
				if (m.isPromotion) {
					source.type = m.promotedTo;
				}
			} else {
				throw Error('Move Source is not valid');
			}
		});
	}

	loadMoves() {
		this.moves = [];
		this.movePairs.forEach((movePair) => {
			let white = movePair.white;
			let black = movePair.black;
			console.log(movePair.id, white, black);
			if (white != undefined) {
				let whiteMoves = this.getMovesFromAction(white, movePair.id, true);
				this.performMoves(whiteMoves);
				whiteMoves.forEach((m) => this.moves.push(m));
			}

			if (black != undefined) {
				let blackMoves = this.getMovesFromAction(black, movePair.id, false);
				this.performMoves(blackMoves);
				blackMoves.forEach((m) => this.moves.push(m));
			}
			this.printState();
		});
	}

	getLocations(action) {
		let locations: string[] = [];
		const regex = /[a-h][1-8]/g;
		for (const match of action.matchAll(regex)) {
			locations.push(match[0]);
		}
		return locations;
	}

	isLowerCase = (str) => /^[a-z]*$/.test(str);

	getMovesFromAction(action, pairId, isWhite): Move[] {
		let multiplier = isWhite ? 1 : -1;
		let locations = this.getLocations(action);
		let move: Move = {
			id: 0,
			pair_id: pairId,
			source: -1,
			destination: -1,
			isWhite: isWhite,
			isCheck: false,
			isCapture: false,
			isCheckMate: false,
			isEnPassant: false,
			isPromotion: false,
			promotedTo: undefined
		};

		if (action.indexOf('x') > 0) {
			//capture the location
			action = action.replace('x', '');
			move.isCapture = true;
		}

		if (action.indexOf('#') > 0) {
			//capture the location
			action = action.replace('#', '');
			move.isCheckMate = true;
		}

		if (action.indexOf('+') > 0) {
			//capture the location
			action = action.replace('+', '');
			move.isCheck = true;
		}

		if (action.indexOf('=') > 0) {
			let loc = this.getLocation(locations[0]);
			let colCh = action.substr(0, 1);
			let sou = (this.getRow(loc) + multiplier) * 8 + this.getColFromString(colCh);
			let promotedTo = action.substr(action.indexOf('=') + 1);
			move.source = sou;
			move.destination = loc;
			move.isPromotion = true;
			move.promotedTo = isWhite ? promotedTo.toUpperCase() : promotedTo.toLowerCase();
			return [move];
		}

		if (action === 'O-O') {
			return this.castlingMove(isWhite, pairId, false);
		} else if (action === 'O-O-O') {
			return this.castlingMove(isWhite, pairId, true);
		}

		let location = this.getLocation(locations[0]);
		let locationArr = locations.map((l) => this.getLocation(l));
		if (locations.length == 0) {
			throw new Error('No locations in action:' + action);
		}

		if (action.length === 2) {
			//pawn move
			//figure out the position
			//get the original location
			let original_location = location + multiplier * 8;
			if (this.pieces.find((x) => x.cell_id == original_location) == null) {
				original_location = location + multiplier * 16;
			}
			move.source = original_location;
			move.destination = location;
			return [move];
		}

		// //All others

		let pieceType = action.charAt(0);
		if (this.isLowerCase(pieceType)) {
			//must be a pawn captures
			let enPassant = false;
			let dest = locationArr[locationArr.length - 1];
			//console.log("dest",dest)
			let pd = this.pieces.find((p) => p.cell_id === dest);
			//console.log(pd)
			if (!pd) {
				enPassant = true;
				//capture the pawn right below or right above
				let captureCell = (this.getRow(dest) + multiplier) * 8 + this.getCol(dest);
				let capturePawn = this.pieces.find((p) => p.cell_id === captureCell);
				if (capturePawn) {
					capturePawn.cell_id = -1;
					capturePawn.captured = true;
				} else {
					throw new Error(`En Passant Capture destination does not have pawn ${captureCell}`);
				}
			}
			return this.pawnCaptures(isWhite, locationArr, action, move, enPassant);
		} else if (pieceType === 'N') {
			return this.knightMove(isWhite, location, action, move);
		} else if (pieceType === 'B') {
			return this.bishopMove(isWhite, location, action, move);
		} else if (pieceType === 'R') {
			return this.rookMove(isWhite, location, action, move);
		} else if (pieceType === 'Q') {
			return this.queenMove(isWhite, locationArr, action, move);
		} else if (pieceType === 'K') {
			return this.kingMove(isWhite, location, move);
		} else {
			throw new Error('Could not figure out the action');
		}
	}

	bishopMove = (isWhite, location, action, move): Move[] => {
		let bishops = this.pieces.filter((x) => x.type === (isWhite ? 'B' : 'b') && !x.captured);
		if (bishops.length == 1) {
			move.source = bishops[0].cell_id;
			move.destination = location;
		} else if (bishops.length == 2 && action.length == 3) {
			//find the one that is on the same diagnol as this
			let row = this.getRow(location);
			let col = this.getCol(location);
			let foundBishops: Location[] = [];
			//positive
			for (let i = 1; i <= 7; i++) {
				let r = row + i;
				let c = col + i;
				if (this.isValid(r) && this.isValid(c)) {
					bishops.forEach((b) => {
						if (b.cell_id === r * 8 + c) {
							foundBishops.push({ row: r, col: c });
						}
					});
				}
			}

			for (let i = 1; i <= 7; i++) {
				let r = row - i;
				let c = col - i;
				if (this.isValid(r) && this.isValid(c)) {
					bishops.forEach((b) => {
						if (b.cell_id === r * 8 + c) {
							foundBishops.push({ row: r, col: c });
						}
					});
				}
			}

			for (let i = 1; i <= 7; i++) {
				let r = row + i;
				let c = col - i;
				if (this.isValid(r) && this.isValid(c)) {
					bishops.forEach((b) => {
						if (b.cell_id === r * 8 + c) {
							foundBishops.push({ row: r, col: c });
						}
					});
				}
			}

			for (let i = 1; i <= 7; i++) {
				let r = row - i;
				let c = col + i;
				if (this.isValid(r) && this.isValid(c)) {
					bishops.forEach((b) => {
						if (b.cell_id === r * 8 + c) {
							foundBishops.push({ row: r, col: c });
						}
					});
				}
			}

			if (foundBishops.length == 1) {
				move.source = foundBishops[0].row * 8 + foundBishops[0].col;
				move.destination = location;
			} else {
				throw new Error('No bishops found to move');
			}
		} else if (bishops.length == 2 && action.length == 4) {
			//disambiguation
			//disambiguation
			//see the disambiguation
			let dis = action.charAt(1);
			if (this.isLowerCase(dis)) {
				//this is column
				let col = this.getColFromString(dis);
				let rook = bishops.find((x) => this.getCol(x.cell_id) === col);
				if (rook != null) {
					move.source = rook.cell_id;
					move.destination = location;
				} else {
					throw new Error('Bishop not present at disambiguation by col');
				}
			} else {
				//number, go by row
				let row = this.getRowFromString(dis);
				let rook = bishops.find((x) => this.getRow(x.cell_id) === row);
				if (rook != null) {
					move.source = rook.cell_id;
					move.destination = location;
				} else {
					throw new Error('Bishop not present at disambiguation by col');
				}
			}
		}
		return [move];
	};

	checkAdd = (sourceArr, foundArr, r, c, type) => {
		if (this.isValid(r) && this.isValid(c)) {
			let item = this.pieces.find((p) => p.cell_id === r * 8 + c);
			if (item && item.type !== type) {
				//blocking
				return;
			}
			sourceArr.forEach((b) => {
				if (b.cell_id === r * 8 + c) {
					foundArr.push({ row: r, col: c });
				}
			});
		}
	};

	getQueenLocations = (location, isWhite) => {
		let arr: Location[] = [];
		let row = this.getRow(location);
		let col = this.getCol(location);

		let queens = this.pieces.filter((x) => x.type === (isWhite ? 'Q' : 'q') && !x.captured);
		let foundQueens: Location[] = [];

		//Rook positions

		//north
		for (let i = row - 1; this.isValid(i); i--) {
			console.log('north', i, col);
			let piece = this.pieces.find((x) => x.cell_id === i * 8 + col);
			if (piece != null && piece.type !== (isWhite ? 'Q' : 'q')) {
				break;
			} else if (piece != null && piece.type === (isWhite ? 'Q' : 'q')) {
				foundQueens.push({ row: i, col: col });
				break;
			}
		}
		//south
		for (let i = row + 1; this.isValid(i); i++) {
			console.log('south', i, col);
			let piece = this.pieces.find((x) => x.cell_id === i * 8 + col);
			if (piece != null && piece.type !== (isWhite ? 'Q' : 'q')) {
				break;
			} else if (piece != null && piece.type === (isWhite ? 'Q' : 'q')) {
				foundQueens.push({ row: i, col: col });
				break;
			}
		}
		//west
		for (let i = col - 1; this.isValid(i); i--) {
			let piece = this.pieces.find((x) => x.cell_id === row * 8 + i);
			if (piece != null && piece.type !== (isWhite ? 'Q' : 'q')) {
				break;
			} else if (piece != null && piece.type === (isWhite ? 'Q' : 'q')) {
				foundQueens.push({ row: row, col: i });
				break;
			}
		}
		//east
		for (let i = col + 1; this.isValid(i); i++) {
			let piece = this.pieces.find((x) => x.cell_id === row * 8 + i);
			if (piece != null && piece.type !== (isWhite ? 'Q' : 'q')) {
				break;
			} else if (piece != null && piece.type === (isWhite ? 'Q' : 'q')) {
				foundQueens.push({ row: row, col: i });
				break;
			}
		}

		//Bishop positions
		//positive
		for (let i = 1; i <= 7; i++) {
			let r = row + i;
			let c = col + i;
			this.checkAdd(queens, foundQueens, r, c, isWhite ? 'Q' : 'q');
		}

		for (let i = 1; i <= 7; i++) {
			let r = row - i;
			let c = col - i;
			this.checkAdd(queens, foundQueens, r, c, isWhite ? 'Q' : 'q');
		}

		for (let i = 1; i <= 7; i++) {
			let r = row + i;
			let c = col - i;
			this.checkAdd(queens, foundQueens, r, c, isWhite ? 'Q' : 'q');
		}

		for (let i = 1; i <= 7; i++) {
			let r = row - i;
			let c = col + i;
			this.checkAdd(queens, foundQueens, r, c, isWhite ? 'Q' : 'q');
		}

		return foundQueens;
	};

	queenMove = (isWhite: boolean, locations: number[], action: string, move: Move) => {
		let queens = this.pieces.filter((x) => x.type === (isWhite ? 'Q' : 'q') && !x.captured);
		if (queens.length === 1 && locations.length === 1) {
			move.source = queens[0].cell_id;
			move.destination = locations[0];
		} else if (queens.length > 1 && locations.length == 1) {
			//Find Queens
			let foundQueens = this.getQueenLocations(locations[0], isWhite);
			console.log(foundQueens);
			if (foundQueens.length === 1) {
				move.source = foundQueens[0].row * 8 + foundQueens[0].col;
				move.destination = locations[0];
				return [move];
			} else {
				//disambiguation
				let dis = action.charAt(1);
				if (this.isLowerCase(dis)) {
					//this is column
					let col = this.getColFromString(dis);
					let queen = queens.find((x) => this.getCol(x.cell_id) === col);
					if (queen != null) {
						move.source = queen.cell_id;
						move.destination = locations[0];
					} else {
						throw new Error('queen not present at disambiguation by col');
					}
				} else {
					//number, go by row
					let row = this.getRowFromString(dis);
					let queen = queens.find((x) => this.getRow(x.cell_id) === row);
					if (queen != null) {
						move.source = queen.cell_id;
						move.destination = locations[0];
					} else {
						throw new Error('queen not present at disambiguation by col');
					}
				}
				return [move];
			}
			//throw new Error("Multiple Queens not implemented")
		} else {
			throw new Error('No Queen found');
		}
		return [move];
	};

	kingMove = (isWhite, location, move: Move): Move[] => {
		let king = this.pieces.find((x) => x.type === (isWhite ? 'K' : 'k'));
		if (king != null) {
			move.source = king.cell_id;
			move.destination = location;
		} else {
			throw new Error('No King found');
		}
		return [move];
	};

	getKnightLocations = (location) => {
		let arr: Location[] = [];
		let row = this.getRow(location);
		let col = this.getCol(location);

		if (this.isValid(row - 2) && this.isValid(col - 1)) {
			arr.push({ row: row - 2, col: col - 1 });
		}
		if (this.isValid(row - 2) && this.isValid(col + 1)) {
			arr.push({ row: row - 2, col: col + 1 });
		}
		if (this.isValid(row - 1) && this.isValid(col - 2)) {
			arr.push({ row: row - 1, col: col - 2 });
		}
		if (this.isValid(row - 1) && this.isValid(col + 2)) {
			arr.push({ row: row - 1, col: col + 2 });
		}
		if (this.isValid(row + 2) && this.isValid(col + 1)) {
			arr.push({ row: row + 2, col: col + 1 });
		}
		if (this.isValid(row + 1) && this.isValid(col + 2)) {
			arr.push({ row: row + 1, col: col + 2 });
		}
		if (this.isValid(row + 1) && this.isValid(col - 2)) {
			arr.push({ row: row + 1, col: col - 2 });
		}
		if (this.isValid(row + 2) && this.isValid(col - 1)) {
			arr.push({ row: row + 2, col: col - 1 });
		}

		return arr;
	};

	knightMove = (isWhite: boolean, location: number, action: string, move: Move): Move[] => {
		//find the knights
		let knights = this.pieces.filter((x) => x.type === (isWhite ? 'N' : 'n') && !x.captured);
		console.log(knights);
		//if only one knight = move it there
		if (knights.length === 1) {
			//only one knight alive
			console.log('only one knight alive');
			move.source = knights[0].cell_id;
			move.destination = location;
		} else if (knights.length === 2 && action.length === 3) {
			//both knights alive
			//figure out which knight it is
			let knightLocations = this.getKnightLocations(location);
			//find the knight
			knights.forEach((k) => {
				if (knightLocations.find((x) => x.row * 8 + x.col === k.cell_id)) {
					move.source = k.cell_id;
					move.destination = location;
				}
			});
		} else if (knights.length === 2 && action.length === 4) {
			//see the disambiguation
			let dis = action.charAt(1);
			if (this.isLowerCase(dis)) {
				//this is column
				let col = this.getColFromString(dis);
				let knight = knights.find((x) => this.getCol(x.cell_id) === col);
				if (knight != null) {
					move.source = knight.cell_id;
					move.destination = location;
				} else {
					throw new Error('No knight at disambiguation column');
				}
			} else {
				//number, go by row
				let row = this.getRowFromString(dis);
				let knight = knights.find((x) => this.getRow(x.cell_id) === row);
				if (knight != null) {
					move.source = knight.cell_id;
					move.destination = location;
				} else {
					throw new Error('No knight at disambiguation row');
				}
			}
		}
		if (move.source === -1 || move.destination === -1) {
			this.printState();
			throw new Error(`Knight move could not be figured out with action ${action}`);
		}
		return [move];
	};

	castlingMove(isWhite, pairId, isQueenSide): Move[] {
		let kingMove = {
			id: 0,
			pair_id: pairId,
			source: 0,
			destination: 0,
			isWhite: isWhite,
			isCheck: false,
			isCapture: false,
			isCheckMate: false,
			isEnPassant: false,
			isPromotion: false,
			promotedTo: undefined
		};

		let rookMove = {
			id: 0,
			pair_id: pairId,
			source: 0,
			destination: 0,
			isWhite: isWhite,
			isCheck: false,
			isCapture: false,
			isCheckMate: false,
			isEnPassant: false,
			isPromotion: false,
			promotedTo: undefined
		};

		let king = this.pieces.find((x) => x.type === (isWhite ? 'K' : 'k'));
		if (king == null) {
			throw new Error(`Could not find ${isWhite ? 'White' : 'Black'} King`);
		}
		let rookLocation = 0;
		if (isWhite && !isQueenSide) {
			rookLocation = 63;
		} else if (!isWhite && !isQueenSide) {
			rookLocation = 7;
		} else if (isWhite && isQueenSide) {
			rookLocation = 56;
		} else if (!isWhite && isQueenSide) {
			rookLocation = 0;
		}
		let rook = this.pieces.find(
			(x) => x.type === (isWhite ? 'R' : 'r') && x.cell_id === rookLocation
		);
		if (rook == null) {
			throw new Error(`Could not find ${isWhite ? 'White' : 'Black'} Rook`);
		}
		if (isWhite && !isQueenSide) {
			kingMove.source = king.cell_id;
			kingMove.destination = 62;
			rookMove.source = rook.cell_id;
			rookMove.destination = 61;
		} else if (!isWhite && !isQueenSide) {
			kingMove.source = king.cell_id;
			kingMove.destination = 6;
			rookMove.source = rook.cell_id;
			rookMove.destination = 5;
		} else if (isWhite && isQueenSide) {
			kingMove.source = king.cell_id;
			kingMove.destination = 58;
			rookMove.source = rook.cell_id;
			rookMove.destination = 59;
		} else if (!isWhite && isQueenSide) {
			kingMove.source = king.cell_id;
			kingMove.destination = 2;
			rookMove.source = rook.cell_id;
			rookMove.destination = 3;
		}

		return [kingMove, rookMove];
	}

	rookMove = (isWhite: boolean, location: number, action: string, move: Move): Move[] => {
		let rooks = this.pieces.filter((x) => x.type === (isWhite ? 'R' : 'r') && !x.captured);
		if (rooks.length === 1) {
			//only one
			move.source = rooks[0].cell_id;
			move.destination = location;
		} else if (rooks.length === 2 && action.length === 3) {
			let row = this.getRow(location);
			let col = this.getCol(location);
			console.log(row, col);
			//find the rook that is valid
			let foundRooks: Location[] = [];
			//north
			for (let i = row - 1; this.isValid(i); i--) {
				console.log('north', i, col);
				let piece = this.pieces.find((x) => x.cell_id === i * 8 + col);
				if (piece != null && piece.type !== (isWhite ? 'R' : 'r')) {
					console.log('block', piece.type);
					break;
				} else if (piece != null && piece.type === (isWhite ? 'R' : 'r')) {
					foundRooks.push({ row: i, col: col });
					break;
				}
				this.cells[i * 8 + col].mark = true;
			}
			//south
			for (let i = row + 1; this.isValid(i); i++) {
				console.log('south', i, col);
				let piece = this.pieces.find((x) => x.cell_id === i * 8 + col);
				if (piece != null && piece.type !== (isWhite ? 'R' : 'r')) {
					break;
				} else if (piece != null && piece.type === (isWhite ? 'R' : 'r')) {
					foundRooks.push({ row: i, col: col });
					break;
				}
				this.cells[i * 8 + col].mark = true;
			}
			//west
			for (let i = col - 1; this.isValid(i); i--) {
				let piece = this.pieces.find((x) => x.cell_id === row * 8 + i);
				if (piece != null && piece.type !== (isWhite ? 'R' : 'r')) {
					break;
				} else if (piece != null && piece.type === (isWhite ? 'R' : 'r')) {
					foundRooks.push({ row: row, col: i });
					break;
				}
				this.cells[i * 8 + col].mark = true;
			}
			//east
			for (let i = col + 1; this.isValid(i); i++) {
				let piece = this.pieces.find((x) => x.cell_id === row * 8 + i);
				if (piece != null && piece.type !== (isWhite ? 'R' : 'r')) {
					break;
				} else if (piece != null && piece.type === (isWhite ? 'R' : 'r')) {
					foundRooks.push({ row: row, col: i });
					break;
				}
				this.cells[i * 8 + col].mark = true;
			}
			console.log('foundRooks:', foundRooks);
			if (foundRooks.length == 1) {
				move.source = foundRooks[0].row * 8 + foundRooks[0].col;
				move.destination = location;
			} else if (foundRooks.length > 1) {
				//console.log("More than one rook but no disambiguation found to move");
				move.source = foundRooks[0].row * 8 + foundRooks[0].col;
				move.destination = location;
				throw new Error('More than one rook but no disambiguation found to move');
			} else {
				throw new Error('No rooks found');
			}
		} else if (rooks.length === 2 && action.length === 4) {
			//disambiguation
			//see the disambiguation
			let dis = action.charAt(1);
			if (this.isLowerCase(dis)) {
				//this is column
				let col = this.getColFromString(dis);
				let rook = rooks.find((x) => this.getCol(x.cell_id) === col);
				if (rook != null) {
					move.source = rook.cell_id;
					move.destination = location;
				} else {
					throw new Error('Rook not present at disambiguation by col');
				}
			} else {
				//number, go by row
				let row = this.getRowFromString(dis);
				let rook = rooks.find((x) => this.getRow(x.cell_id) === row);
				if (rook != null) {
					move.source = rook.cell_id;
					move.destination = location;
				} else {
					throw new Error('Rook not present at disambiguation by col');
				}
			}
		}
		return [move];
	};

	isValid = (rowcol) => {
		if (rowcol >= 0 && rowcol < 8) {
			return true;
		}
		return false;
	};

	pawnCaptures = (
		isWhite: boolean,
		locationArr: number[],
		action: string,
		move: Move,
		enPassant: boolean
	): Move[] => {
		//captures move
		console.log('pawn captures move', locationArr, enPassant);
		if (locationArr.length == 1) {
			let destination = locationArr[0];
			let source = this.getLocation(
				action.charAt(0) + (parseInt(action.substr(2, 1)) - 1) //across
			);
			if (!isWhite) {
				source = this.getLocation(
					action.charAt(0) + (parseInt(action.substr(2, 1)) + 1) //across
				);
			}
			move.source = source;
			move.destination = destination;
			return [move];
		} else {
			throw new Error('Pawn captures multiple locations not implemented');
		}
	};

	getLocation(position) {
		if (position.length === 2) {
			let col = this.getColFromString(position.charAt(0));
			let row = this.getRowFromString(position.charAt(1));
			return row * 8 + col;
		}
		return -1;
	}

	//This function is used to convert 1,2,3, to rows 7,6,5 etc
	getRowFromString(ch): number {
		return 8 - parseInt(ch);
	}

	//Get the column from a char - a, b, c etc to 0, 1, 2 etc
	getColFromString(ch): number {
		return ch.charCodeAt(0) - 97;
	}

	getRow(location): number {
		return Math.floor(location / 8);
	}

	getCol(location): number {
		return Math.floor(location % 8);
	}

	isPGNValid(): boolean {
		// Check if moves are ok - Skip the last move
		for (let i = 0; i < this.movePairs.length - 1; i++) {
			let move = this.movePairs[i];
			if (move.black === undefined || move.white === undefined || move.id === 0) {
				return false;
			}
		}

		//next check if the moves are sequential
		for (let i = 0; i < this.movePairs.length; i++) {
			if (this.movePairs[i].id === i + 1) {
				return false;
			}
		}

		return true;
	}
}
