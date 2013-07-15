function typeAtom( offsetMillis, leafInfo ) {
    // NOTE: The leafInfo isn't actually part of the type, but we use
    // it to annotate the type tree with metadata.
    return { op: "atom",
        offsetMillis: offsetMillis, leafInfo: leafInfo };
}
function typeTimes( first, second ) {
    return { op: "times", first: first, second: second };
}
function typeOne() {
    return { op: "one" };
}
function typePlus( left, right ) {
    return { op: "plus", left: left, right: right };
}
function typeZero() {
    return { op: "zero" };
}

function typesAreEqual( offsetMillis, a, b ) {
    var typesToCompare = [ { a: a, b: b } ];
    while ( typesToCompare.length !== 0 ) {
        var types = typesToCompare.shift();
        var op = types.a.op;
        if ( op !== types.b.op )
            return false;
        if ( op === "atom" ) {
            if ( types.a.offsetMillis + offsetMillis !==
                types.b.offsetMillis )
                return false;
        } else if ( op === "times" ) {
            typesToCompare.push(
                { a: types.a.first, b: types.b.first } );
            typesToCompare.push(
                { a: types.a.second, b: types.b.second } );
        } else if ( op === "one" ) {
            // Do nothing.
        } else if ( op === "plus" ) {
            typesToCompare.push(
                { a: types.a.left, b: types.b.left } );
            typesToCompare.push(
                { a: types.a.right, b: types.b.right } );
        } else if ( op === "zero" ) {
            // Do nothing.
        } else {
            throw new Error();
        }
    }
    return true;
}

function typesUnify( a, b ) {
    var typesToCompare = [ { a: a, b: b } ];
    var offsetMillis = null;
    while ( typesToCompare.length !== 0 ) {
        var types = typesToCompare.shift();
        var op = types.a.op;
        if ( op !== types.b.op )
            return null;
        if ( op === "atom" ) {
            var thisOffsetMillis =
                types.b.offsetMillis - types.a.offsetMillis;
            if ( offsetMillis === null )
                offsetMillis = thisOffsetMillis;
            else if ( offsetMillis !== thisOffsetMillis )
                return null;
        } else if ( op === "times" ) {
            typesToCompare.push(
                { a: types.a.first, b: types.b.first } );
            typesToCompare.push(
                { a: types.a.second, b: types.b.second } );
        } else if ( op === "one" ) {
            // Do nothing.
        } else if ( op === "plus" ) {
            typesToCompare.push(
                { a: types.a.left, b: types.b.left } );
            typesToCompare.push(
                { a: types.a.right, b: types.b.right } );
        } else if ( op === "zero" ) {
            // Do nothing.
        } else {
            throw new Error();
        }
    }
    return { offsetMillis: offsetMillis };
}

function mapTypeAtomNodes( type, func ) {
    var op = type.op;
    if ( op === "atom" ) {
        return func( type );
    } else if ( op === "times" ) {
        return typeTimes(
            mapTypeAtomNodes( type.first, func ),
            mapTypeAtomNodes( type.second, func ) );
    } else if ( op === "one" ) {
        return type;
    } else if ( op === "plus" ) {
        return typePlus(
            mapTypeAtomNodes( type.left, func ),
            mapTypeAtomNodes( type.right, func ) );
    } else if ( op === "zero" ) {
        return type;
    } else {
        throw new Error();
    }
}

function eachTypeAtomNodeZipper( type, zipContinuation, body ) {
    var op = type.op;
    if ( op === "atom" ) {
        body( zipContinuation );
    } else if ( op === "times" ) {
        eachTypeAtomNodeZipper( type.first, function ( x ) {
            return zipContinuation( x ).first;
        }, body );
        eachTypeAtomNodeZipper( type.second, function ( x ) {
            return zipContinuation( x ).second;
        }, body );
    } else if ( op === "one" ) {
        // Do nothing.
    } else if ( op === "plus" ) {
        eachTypeAtomNodeZipper( type.left, function ( x ) {
            return zipContinuation( x ).left;
        }, body );
        eachTypeAtomNodeZipper( type.right, function ( x ) {
            return zipContinuation( x ).right;
        }, body );
    } else if ( op === "zero" ) {
        // Do nothing.
    } else {
        throw new Error();
    }
}

function typePlusOffsetMillis( type, offsetMillis ) {
    return mapTypeAtomNodes( type, function ( type ) {
        return typeAtom(
            type.offsetMillis + offsetMillis, type.leafInfo );
    } );
}

function mapTypeLeafInfo( type, func ) {
    return mapTypeAtomNodes( type, function ( type ) {
        return typeAtom( type.offsetMillis, func( type.leafInfo ) );
    } );
}

// ===== Behavior category ===========================================

// TODO: See what this would be called in Sirea.
function behId( type ) {
    var result = {};
    result.inType = type;
    result.outType = type;
    result.install = function ( startMillis, inSigs, outSigs ) {
        eachTypeAtomNodeZipper( type, _.idfn, function ( get ) {
            var inSig = get( inSigs ).leafInfo;
            var outSig = get( outSigs ).leafInfo;
            inSig.readEachEntry( function ( entry ) {
                outSig.history.addEntry( entry );
            } );
        } );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behSeq( behOne, behTwo ) {
    var how = typesUnify( behOne.outType, behTwo.inType );
    if ( how === null )
        throw new Error();
    
    var result = {};
    result.inType = behOne.inType;
    result.outType =
        typePlusOffsetMillis( behTwo.outType, how.offsetMillis );
    result.install = function ( startMillis, inSigs, outSigs ) {
        var pairs =
            mapTypeLeafInfo( behOne.outType, function ( ignored ) {
                return makeLinkedSigPair( startMillis );
            } );
        var writables = mapTypeLeafInfo( pairs, function ( pair ) {
            return pair.writable;
        } );
        var readables = mapTypeLeafInfo( pairs, function ( pair ) {
            return pair.readable;
        } );
        
        behOne.install( startMillis, inSigs, writables );
        behTwo.install( startMillis, readables, outSigs );
    };
    return result;
}
function behSeqs( first, var_args ) {
    return _.arrFoldl( first, _.arrCut( arguments, 1 ),
        function ( a, b ) {
            return behSeq( a, b );
        } );
}


// ===== Behavior product ============================================

// TODO: See what this would be called in Sirea.
function behFstElim( type ) {
    var result = {};
    result.inType = typeTimes( type, typeOne() );
    result.outType = type;
    result.install = function ( startMillis, inSigs, outSigs ) {
        behId( type ).install( startMillis, inSigs.first, outSigs );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behFstIntro( type ) {
    var result = {};
    result.inType = type;
    result.outType = typeTimes( type, typeOne() );
    result.install = function ( startMillis, inSigs, outSigs ) {
        behId( type ).install( startMillis, inSigs, outSigs.first );
    };
    return result;
}
function behFirst( beh, otherType ) {
    var result = {};
    result.inType = typeTimes( beh.inType, otherType );
    result.outType = typeTimes( beh.outType, otherType );
    result.install = function ( startMillis, inSigs, outSigs ) {
        beh.install( startMillis, inSigs.first, outSigs.first );
        behId( otherType ).install( startMillis,
            inSigs.second, outSigs.second );
    };
    return result;
}
function behSwap( origFirstType, origSecondType ) {
    var result = {};
    result.inType = typeTimes( origFirstType, origSecondType );
    result.outType = typeTimes( origSecondType, origFirstType );
    result.install = function ( startMillis, inSigs, outSigs ) {
        behId( origFirstType ).install( startMillis,
            inSigs.first, outSigs.second );
        behId( origSecondType ).install( startMillis,
            inSigs.second, outSigs.first );
    };
    return result;
}
function behAssoclp( catcherType, ballType, pitcherType ) {
    var result = {};
    result.inType =
        typeTimes( catcherType, typeTimes( ballType, pitcherType ) );
    result.outType =
        typeTimes( typeTimes( catcherType, ballType ), pitcherType );
    result.install = function ( startMillis, inSigs, outSigs ) {
        behId( catcherType ).install( startMillis,
            inSigs.first, outSigs.first.first );
        behId( ballType ).install( startMillis,
            inSigs.second.first, outSigs.first.second );
        behId( pitcherType ).install( startMillis,
            inSigs.second.second, outSigs.second );
    };
    return result;
}
function behDup( type ) {
    var result = {};
    result.inType = type;
    result.outType = typeTimes( type, type );
    result.install = function ( startMillis, inSigs, outSigs ) {
        eachTypeAtomNodeZipper( type, _.idfn, function ( get ) {
            var inSig = get( inSigs ).leafInfo;
            var outSigFirst = get( outSigs.first ).leafInfo;
            var outSigSecond = get( outSigs.second ).leafInfo;
            inSig.readEachEntry( function ( entry ) {
                outSigFirst.history.addEntry( entry );
                outSigSecond.history.addEntry( entry );
            } );
        } );
    };
    return result;
}
function behDrop( type ) {
    var result = {};
    result.inType = type;
    result.outType = typeOne();
    result.install = function ( startMillis, inSigs, outSigs ) {
        eachTypeAtomNodeZipper( type, _.idfn, function ( get ) {
            var inSig = get( inSigs ).leafInfo;
            inSig.readEachEntry( function ( entry ) {
                // Do nothing.
            } );
        } );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behSndElim( type ) {
    return behSeqs(
        behSwap( typeOne(), type ),
        behFstElim( type )
    );
}
// TODO: See what this would be called in Sirea.
function behSndIntro( type ) {
    return behSeqs(
        behFstIntro( type ),
        behSwap( type, typeOne() )
    );
}
function behSecond( otherType, beh ) {
    return behSeqs(
        behSwap( otherType, beh.inType ),
        behFirst( beh, otherType ),
        behSwap( beh.outType, otherType )
    );
}
function behAssocrp( pitcherType, ballType, catcherType ) {
    return behSeqs(
        behFirst( behSwap( pitcherType, ballType ), catcherType ),
        behSwap( typeTimes( ballType, pitcherType ), catcherType ),
        behAssoclp( catcherType, ballType, pitcherType ),
        behFirst( behSwap( catcherType, ballType ), pitcherType ),
        behSwap( typeTimes( ballType, catcherType ), pitcherType )
    );
}
// TODO: See what this would be called in Sirea.
function behPar( firstBeh, secondBeh ) {
    return behSeqs(
        behFirst( firstBeh, secondBeh.inType ),
        behSecond( firstBeh.outType, secondBeh )
    );
}
// TODO: See what this would be called in Sirea.
function behDupPar( firstBeh, secondBeh ) {
    return behSeqs(
        behDup( firstBeh.inType ),
        behPar( firstBeh, secondBeh )
    );
}
function behFst( typeUsed, typeUnused ) {
    return behSeqs(
        behSecond( typeUsed, behDrop( typeUnused ) ),
        behFstElim( typeUsed )
    );
}
function behSnd( typeUnused, typeUsed ) {
    return behSeqs(
        behFirst( behDrop( typeUnused ), typeUsed ),
        behSndElim( typeUsed )
    );
}


// ===== Behavior sum ================================================

function consumeEarliestEntries( pendingHistories, body ) {
    while ( _.arrAll( pendingHistories, function ( pending ) {
        return pending.length !== 0;
    } ) ) {
        var earliestEntries =
            _.arrMap( pendingHistories, function ( pending ) {
                return pending.shift();
            } );
        var startMillis = _.arrFoldl( 1 / 0, earliestEntries,
            function ( startMillis, entry ) {
            
            return Math.min( startMillis, entry.startMillis );
        } );
        _.arrEach( pendingHistories, function ( pending, i ) {
            var earliestEntry = earliestEntries[ i ];
            if ( startMillis < earliestEntry.startMillis ) {
                pending.unshift( earliestEntry );
                earliestEntries[ i ] = {
                    maybeData: null,
                    startMillis: startMillis,
                    maybeEndMillis:
                        { val: earliestEntry.startMillis }
                };
            }
        } );
        var endMillis = _.arrFoldl( -1 / 0, earliestEntries,
            function ( endMillis, entry ) {
            
            return Math.max( endMillis, entEnd( entry ) );
        } );
        _.arrEach( pendingHistories, function ( pending, i ) {
            var earliestEntry = earliestEntries[ i ];
            if ( endMillis < entEnd( earliestEntry ) ) {
                pending.unshift( {
                    maybeData: earliestEntry.maybeData,
                    startMillis: endMillis,
                    maybeEndMillis:
                        earliestEntry.maybeEndMillis
                } );
                earliestEntries[ i ] = {
                    maybeData: earliestEntry.maybeData,
                    startMillis: startMillis,
                    maybeEndMillis: { val: endMillis }
                };
            }
        } );
        body( earliestEntries );
    }
}

// TODO: See what this would be called in Sirea.
function behLeftIntro( type ) {
    var result = {};
    result.inType = type;
    result.outType = typePlus( type, typeZero() );
    result.install = function ( startMillis, inSigs, outSigs ) {
        behId( type ).install( startMillis, inSigs, outSigs.left );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behLeftElim( type ) {
    var result = {};
    result.inType = typePlus( type, typeZero() );
    result.outType = type;
    result.install = function ( startMillis, inSigs, outSigs ) {
        behId( type ).install( startMillis, inSigs.left, outSigs );
    };
    return result;
}
function behLeft( beh, otherType ) {
    var result = {};
    result.inType = typePlus( beh.inType, otherType );
    result.outType = typePlus( beh.outType, otherType );
    result.install = function ( startMillis, inSigs, outSigs ) {
        beh.install( startMillis, inSigs.left, outSigs.left );
        behId( otherType ).install( startMillis,
            inSigs.right, outSigs.right );
    };
    return result;
}
function behMirror( origLeftType, origRightType ) {
    var result = {};
    result.inType = typeTimes( origLeftType, origRightType );
    result.outType = typeTimes( origRightType, origLeftType );
    result.install = function ( startMillis, inSigs, outSigs ) {
        behId( origLeftType ).install( startMillis,
            inSigs.left, outSigs.right );
        behId( origRightType ).install( startMillis,
            inSigs.right, outSigs.left );
    };
    return result;
}
function behAssocrs( pitcherType, ballType, catcherType ) {
    var result = {};
    result.inType =
        typePlus( typePlus( pitcherType, ballType ), catcherType );
    result.outType =
        typePlus( pitcherType, typePlus( ballType, catcherType ) );
    result.install = function ( startMillis, inSigs, outSigs ) {
        behId( pitcherType ).install( startMillis,
            inSigs.left.left, outSigs.left );
        behId( ballType ).install( startMillis,
            inSigs.left.right, outSigs.right.left );
        behId( catcherType ).install( startMillis,
            inSigs.right, outSigs.right.right );
    };
    return result;
}
function behMerge( type ) {
    var result = {};
    result.inType = typePlus( type, type );
    result.outType = type;
    result.install = function ( startMillis, inSigs, outSigs ) {
        eachTypeAtomNodeZipper( type, _.idfn, function ( get ) {
            var inSigLeft = get( inSigs.left ).leafInfo;
            var inSigRight = get( inSigs.right ).leafInfo;
            var outSig = get( outSigs ).leafInfo;
            var leftPending = [];
            var rightPending = [];
            inSigLeft.readEachEntry( function ( entry ) {
                leftPending.push( entry );
                processPending();
            } );
            inSigRight.readEachEntry( function ( entry ) {
                rightPending.push( entry );
                processPending();
            } );
            function processPending() {
                consumeEarliestEntries(
                    [ leftPending, rightPending ],
                    function ( earliestEntries ) {
                    
                    var leftEntry = earliestEntries[ 0 ];
                    var rightEntry = earliestEntries[ 1 ];
                    
                    // NOTE: This is a sanity check to make sure the
                    // inputs are as disjoint as the type system
                    // indicates they are.
                    if ( leftEntry.maybeData !== null &&
                        rightEntry.maybeData !== null )
                        throw new Error();
                    
                    outSig.history.addEntry( {
                        maybeData: leftEntry.maybeData !== null ?
                            leftEntry.maybeData :
                            rightEntry.maybeData,
                        startMillis: leftEntry.startMillis,
                        maybeEndMillis: leftEntry.maybeEndMillis
                    } );
                } );
            }
        } );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behVacuous( type ) {
    var result = {};
    result.inType = typeZero();
    result.outType = type;
    result.install = function ( startMillis, inSigs, outSigs ) {
        eachTypeAtomNodeZipper( type, _.idfn, function ( get ) {
            var outSig = get( inSigs ).leafInfo;
            outSig.history.finishData( startMillis );
        } );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behRightIntro( type ) {
    return behSeqs(
        behLeftIntro( type ),
        behMirror( type, typeZero() )
    );
}
// TODO: See what this would be called in Sirea.
function behRightElim( type ) {
    return behSeqs(
        behMirror( typeZero(), type ),
        behLeftElim( type )
    );
}
function behRight( otherType, beh ) {
    return behSeqs(
        behMirror( otherType, beh.inType ),
        behLeft( beh, otherType ),
        behMirror( beh.outType, otherType )
    );
}
function behAssocls( catcherType, ballType, pitcherType ) {
    return behSeqs(
        behMirror( catcherType, typePlus( ballType, pitcherType ) ),
        behLeft( behMirror( ballType, pitcherType ), catcherType ),
        behAssocrs( pitcherType, ballType, catcherType ),
        behMirror( pitcherType, typePlus( ballType, catcherType ) ),
        behLeft( behMirror( ballType, catcherType ), pitcherType )
    );
}
// TODO: See what this would be called in Sirea.
function behEither( leftBeh, rightBeh ) {
    return behSeqs(
        behLeft( leftBeh, rightBeh.inType ),
        behRight( leftBeh.outType, rightBeh )
    );
}
// TODO: See what this would be called in Sirea.
function behEitherMerge( leftBeh, rightBeh ) {
    return behSeqs(
        behEither( leftBeh, rightBeh ),
        behMerge( leftBeh.outType )
    );
}
function behInl( typeUseful, typeUseless ) {
    return behSeqs(
        behLeftIntro( typeUseful ),
        behRight( typeUseful, behVacuous( typeUseless ) )
    );
}
function behInr( typeUseless, typeUseful ) {
    return behSeqs(
        behRightIntro( typeUseful ),
        behLeft( behVacuous( typeUseless ), typeUseful )
    );
}


// ===== Behavior product and sum interactions =======================

function behConjoin( branchType, leftType, rightType ) {
    return behDupPar(
        behEitherMerge(
            behFst( branchType, leftType ),
            behFst( branchType, rightType )
        ),
        behEither(
            behSnd( branchType, leftType ),
            behSnd( branchType, rightType )
        )
    );
}

// NOTE: Unlike Sirea's disjoin, this version has a type which is a
// somewhat complicated refinement of the ideal type signature:
//
// (x & (y | z)) ~> ((x & y) | (x & z))
//
// The refinement would state that every spacetime coordinate
// appearing in the x type must appear identically, at least once, in
// the (y | z) type. The operation will perform no implicit
// synchronization or communication.
//
// We don't actually implement multiple partitions yet, so for now we
// only deal with the time coordinate. The space coordinate is the
// same for all atomic signals.
//
function behDisjoin( branchType, leftType, rightType ) {
    var branchAtomNodes = mapTypeAtomNodes( branchType, _.idfn );
    var leftAtomNodes = mapTypeAtomNodes( leftType, _.idfn );
    var rightAtomNodes = mapTypeAtomNodes( rightType, _.idfn );
    if ( !_.arrAll( branchAtomNodes, function ( branchAtomNode ) {
        return _.arrAny( _.arrPlus( leftAtomNodes, rightAtomNodes ),
            function ( informantAtomNode ) {
            
            // NOTE: In general, we should also check that the
            // partitions match.
            return branchAtomNode.offsetMillis ===
                informantAtomNode.offsetMillis;
        } );
    } ) )
        throw new Error();
    var result = {};
    result.inType =
        typeTimes( branchType, typePlus( leftType, rightType ) );
    result.outType = typePlus(
        typeTimes( branchType, leftType ),
        typeTimes( branchType, rightType ) );
    result.install = function ( startMillis, inSigs, outSigs ) {
        var bins = [];
        function getBin( offsetMillis ) {
            return _.arrAny( bins, function ( bin ) {
                return bin.offsetMillis === offsetMillis;
            } );
        }
        eachTypeAtomNodeZipper( branchType, _.idfn, function ( get ) {
            var inSig = get( inSigs.first ).leafInfo;
            var outSigLeft = get( outSigs.left.first ).leafInfo;
            var outSigRight = get( outSigs.right.first ).leafInfo;
            var offsetMillis = get( branchType ).offsetMillis;
            
            var bin = getBin( offsetMillis );
            if ( !bin ) {
                bin = {
                    hasInformant: {},
                    offsetMillis: offsetMillis,
                    branchesPending: [],
                    informantsPending: []
                };
                bins.push( bin );
            }
            var pending = [];
            bin.branchesPending.push( {
                outSigLeft: outSigLeft,
                outSigRight: outSigRight,
                conditionPending: [],
                dataPending: pending
            } );
            inSig.readEachEntry( function ( entry ) {
                pending.push( entry );
                processPending();
            } );
        } );
        
        function eachOnOneSide( condition, type, inSigs, outSigs ) {
            eachTypeAtomNodeZipper( type, _.idfn, function ( get ) {
                var inSig = get( inSigs ).leafInfo;
                var outSig = get( outSigs ).leafInfo;
                var offsetMillis = get( branchType ).offsetMillis;
                
                var bin = getBin( offsetMillis );
                bin.hasInormant[ condition ] = true;
                
                var pending = [];
                if ( bin )
                    bin.informantsPending.push( pending );
                inSig.readEachEntry( function ( entry ) {
                    outSig.history.addEntry( entry );
                    // Store this activity profile for use in the
                    // branch, but don't bother keeping all this
                    // signal's data.
                    if ( bin ) {
                        pending.push( {
                            maybeData: entry.maybeData === null ?
                                null : { val: condition },
                            startMillis: entry.startMillis,
                            maybeEndMillis: entry.maybeEndMillis
                        } );
                        processPending();
                    }
                } );
            } );
        }
        eachOnOneSide( "left", leftType,
            inSigs.second.left, outSigs.left.second );
        eachOnOneSide( "right", rightType,
            inSigs.second.right, outSigs.right.second );
        
        function processPending() {
            _.arrEach( bins, function ( bin ) {
                
                // TODO: Whoops, this waits until every single
                // informant has information about the branch. We
                // should really know what the branch will be as soon
                // as at least one informant tells us.
                consumeEarliestEntries( bin.informantsPending,
                    function ( earliestEntries ) {
                    
                    var maybeCondition = null;
                    _.arrEach( earliestEntries, function ( entry ) {
                        if ( entry.maybeData === null )
                            return;
                        if ( maybeCondition === null )
                            maybeCondition = entry.maybeData;
                        // NOTE: This is a sanity check to make sure
                        // the inputs are as disjoint as the type
                        // system indicates they are.
                        if ( maybeCondition.val !==
                            entry.maybeData.val )
                            throw new Error();
                    } );
                    var conditionEntry = {
                        maybeData: maybeCondition,
                        startMillis: earliestEntries[ 0 ].startMillis,
                        maybeEndMillis:
                            earliestEntries[ 0 ].maybeEndMillis
                    };
                    _.arrEach( bin.branchesPending,
                        function ( branch ) {
                        
                        branch.conditionPending.push(
                            conditionEntry );
                    } );
                } );
                
                _.arrEach( bin.branchesPending, function ( branch ) {
                    consumeEarliestEntries( [
                        branch.conditionPending,
                        branch.dataPending
                    ], function ( earliestEntries ) {
                        var conditionEntry = earliestEntries[ 0 ];
                        var dataEntry = earliestEntries[ 1 ];
                        
                        // NOTE: This is a sanity check to make sure
                        // the inputs are as synchronized as the type
                        // system indicates they are.
                        if ( conditionEntry.maybeData !== null &&
                            dataEntry.maybeData === null )
                            throw new Error();
                        
                        var nullEntry = {
                            maybeData: null,
                            startMillis: dataEntry.startMillis,
                            maybeEndMillis: dataEntry.maybeEndMillis
                        };
                        
                        if ( dataEntry.maybeData === null ) {
                            branch.outSigLeft.history.addEntry(
                                nullEntry );
                            branch.outSigRight.history.addEntry(
                                nullEntry );
                            
                        } else if (
                            conditionEntry.maybeData.val === "left"
                            || !bin.hasInformant[ "left" ] ) {
                            
                            branch.outSigLeft.history.addEntry(
                                dataEntry );
                            branch.outSigRight.history.addEntry(
                                nullEntry );
                            
                        } else if (
                            conditionEntry.maybeData.val === "right"
                            || !bin.hasInformant[ "right" ] ) {
                            
                            branch.outSigLeft.history.addEntry(
                                nullEntry );
                            branch.outSigRight.history.addEntry(
                                dataEntry );
                        } else {
                            throw new Error();
                        }
                    } );
                } );
            } );
        }
    };
    return result;
}


// ===== Other behavior operations ===================================

function behDelay( delayMillis, type ) {
    var result = {};
    result.inType = type;
    result.outType = typePlusOffsetMillis( type, delayMillis );
    result.install = function ( startMillis, inSigs, outSigs ) {
        eachTypeAtomNodeZipper( type, _.idfn, function ( get ) {
            var inSig = get( inSigs ).leafInfo;
            var outSig = get( outSigs ).leafInfo;
            inSig.readEachEntry( function ( entry ) {
                outSig.history.addEntry( {
                    maybeData: entry.maybeData,
                    startMillis: entry.startMillis + delayMillis,
                    maybeEndMillis:
                        entry.maybeEndMillis === null ? null :
                            { val: entry.maybeEndMillis.val +
                                delayMillis }
                } );
            } );
        } );
    };
    return result;
}

function behFmap( func ) {
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType = typeAtom( 0, null );
    result.install = function ( startMillis, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        var outSig = outSigs.leafInfo;
        inSig.readEachEntry( function ( entry ) {
            outSig.history.addEntry( {
                maybeData: entry.maybeData === null ? null :
                    { val: func( entry.maybeData.val ) },
                startMillis: entry.startMillis,
                maybeEndMillis: entry.maybeEndMillis
            } );
        } );
    };
    return result;
}

// NOTE: The inbound values must be of the form [ "<", _ ] or
// [ ">", _ ]. Otherwise this will throw a run time error.
function behSplit() {
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType =
        typePlus( typeAtom( 0, null ), typeAtom( 0, null ) );
    result.install = function ( startMillis, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        var outSigLeft = outSigs.left.leafInfo;
        var outSigRight = outSigs.right.leafInfo;
        inSig.readEachEntry( function ( entry ) {
            var direction = null;
            if ( entry.maybeData !== null
                && _.likeArray( entry.maybeData.val )
                && entry.maybeData.val.length === 2 )
                direction = entry.maybeData.val[ 0 ];
            if ( !(direction === "<" || direction === ">") )
                throw new Error();
            outSigLeft.history.addEntry( {
                maybeData: direction === "<" ?
                    { val: entry.maybeData.val[ 1 ] } : null,
                startMillis: entry.startMillis,
                maybeEndMillis: entry.maybeEndMillis
            } );
            outSigRight.history.addEntry( {
                maybeData: direction === ">" ?
                    { val: entry.maybeData.val[ 1 ] } : null,
                startMillis: entry.startMillis,
                maybeEndMillis: entry.maybeEndMillis
            } );
        } );
    };
    return result;
}

function behZip() {
    var result = {};
    result.inType =
        typeTimes( typeAtom( 0, null ), typeAtom( 0, null ) );
    result.outType = typeAtom( 0, null );
    result.install = function ( startMillis, inSigs, outSigs ) {
        var inSigFirst = inSigs.first.leafInfo;
        var inSigSecond = inSigs.second.leafInfo;
        var outSig = outSigs.leafInfo;
        
        var entriesFirst = [];
        var entriesSecond = [];
        inSigFirst.readEachEntry( function ( entry ) {
            entriesFirst.push( entry );
            sendOut();
        } );
        inSigSecond.readEachEntry( function ( entry ) {
            entriesSecond.push( entry );
            sendOut();
        } );
        function sendOut() {
            // TODO: See if this should use consumeEarliestEntries.
            // For that matter, see if consumeEarliestEntries should
            // use this!
            if ( entriesFirst.length === 0
                || entriesSecond.length === 0 )
                return;
            var endFirstMillis = entsEnd( entriesFirst );
            var endSecondMillis = entsEnd( entriesSecond );
            var endToSendMillis =
                Math.min( endFirstMillis, endSecondMillis );
            eachZipEnts( 0, entriesFirst, entriesSecond,
                function ( maybeFirstData, maybeSecondData,
                    startMillis, endMillis ) {
                
                if ( endToSendMillis <= startMillis )
                    return;
                var thisEndToSendMillis =
                    Math.min( endToSendMillis, endMillis );
                
                // NOTE: This is a sanity check to make sure the
                // inputs are as synchronized as the type system
                // indicates they are.
                if ( (maybeFirstData === null) !==
                    (maybeSecondData === null) )
                    throw new Error();
                
                outSig.history.addEntry( {
                    maybeData: maybeFirstData === null ? null :
                        { val: [
                            maybeFirstData.val,
                            maybeSecondData.val
                        ] },
                    startMillis: startMillis,
                    maybeEndMillis: thisEndToSendMillis === 1 / 0 ?
                        null : { val: thisEndToSendMillis }
                } );
            } );
            while ( entEnd( entriesFirst[ 0 ] ) <= endToSendMillis )
                entriesFirst.shift();
            while ( entEnd( entriesSecond[ 0 ] ) <= endToSendMillis )
                entriesSecond.shift();
        }
    };
    return result;
}

// TODO: Implement some additional axiomatic operations like these
// featured in Sirea's readme:
//
// beval :: (BDynamic b b', SigInP p x) =>
//   DT -> b (S p (b' x y) :&: x) (y :|: S p ())
// bcross ::
//   (BCross b, Partition p, Partition p') => b (S p0 x) (S pf x)


// ===== Ad hoc side effects =========================================

function behMouseQuery() {
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType = typeAtom( 0, null );
    result.install = function ( startMillis, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        var outSig = outSigs.leafInfo;
        linkMouseQuery( inSig, outSig );
    };
    return result;
}

function behDomDiagnostic( syncOnLinkMetadata ) {
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType = typeAtom( 0, null );
    result.install = function ( startMillis, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        var outSig = outSigs.leafInfo;
        syncOnLinkMetadata( linkDomDiagnostic( inSig, outSig ) );
    };
    return result;
}


// ===== Tests =======================================================

function makeTestForBehaviors() {
    // NOTE: Although we delay the mouse-measurement demand by two
    // seconds, we demand the measurement at the midpoint between our
    // demand and the response, so we actually observe a delay of only
    // half that interval.
    var mouseDelayMillis = 2000;
    var measurementDelayMillis = mouseDelayMillis / 2;
    
    var dom = null;
    
    var nowMillis = new Date().getTime();
    var step1 = makeLinkedSigPair( nowMillis );
    var step2 = makeLinkedSigPair( nowMillis );
    behSeqs(
        behDelay( measurementDelayMillis, typeAtom( 0, null ) ),
        behMouseQuery(),
        behDelay( mouseDelayMillis - measurementDelayMillis,
            typeAtom( 0, null ) ),
        behDomDiagnostic( function ( linkMetadata ) {
            dom = linkMetadata.dom;
        } )
    ).install( nowMillis,
        typeAtom( 0, step1.readable ),
        typeAtom( mouseDelayMillis, step2.writable ) );
    step2.readable.readEachEntry( function ( entry ) {
        // Do nothing.
    } );
    
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 10;
    var stabilityMillis = 500;  // 20;
    setInterval( function () {
        var nowMillis = new Date().getTime();
        step1.writable.history.setData(
            JSON.stringify( measurementDelayMillis ),
            nowMillis, nowMillis + stabilityMillis );
    }, intervalMillis );
    
    return { dom: dom };
}
