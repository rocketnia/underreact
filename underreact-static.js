function typeAtom( offsetMillis, leafInfo ) {
    if ( !isValidDuration( offsetMillis ) )
        throw new Error();
    // NOTE: The leafInfo isn't actually part of the type for equality
    // purposes, but we use it to annotate the type tree with
    // metadata.
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
function typeAnytimeFn( demand, response, leafInfo ) {
    return { op: "anytimeFn",
        demand: demand, response: response, leafInfo: leafInfo };
}

function typesAreEqual( offsetMillis, a, b ) {
    if ( !isValidDuration( offsetMillis ) )
        throw new Error();
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
        } else if ( op === "anytimeFn" ) {
            return typesUnify( types.a.demand, types.b.demand ) !==
                null;
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
        } else if ( op === "anytimeFn" ) {
            // TODO: Do this without recursion.
            var unifiedDemand =
                typesUnify( types.a.demand, types.b.demand );
            if ( unifiedDemand === null )
                return null;
            var unifiedResponse =
                typesUnify( types.a.response, types.b.response );
            if ( unifiedResponse === null )
                return null;
            if ( unifiedDemand.offsetMillis !==
                unifiedResponse.offsetMillis )
                return null;
        } else {
            throw new Error();
        }
    }
    return { offsetMillis: offsetMillis };
}

function mapTypeLeafNodes( type, func ) {
    var op = type.op;
    if ( op === "atom" ) {
        return func( type );
    } else if ( op === "times" ) {
        return typeTimes(
            mapTypeLeafNodes( type.first, func ),
            mapTypeLeafNodes( type.second, func ) );
    } else if ( op === "one" ) {
        return type;
    } else if ( op === "plus" ) {
        return typePlus(
            mapTypeLeafNodes( type.left, func ),
            mapTypeLeafNodes( type.right, func ) );
    } else if ( op === "zero" ) {
        return type;
    } else if ( op === "anytimeFn" ) {
        return func( type );
    } else {
        throw new Error();
    }
}

function eachTypeLeafNodeZipper( type, zipContinuation, body ) {
    var op = type.op;
    if ( op === "atom" ) {
        body( zipContinuation );
    } else if ( op === "times" ) {
        eachTypeLeafNodeZipper( type.first, function ( x ) {
            return zipContinuation( x ).first;
        }, body );
        eachTypeLeafNodeZipper( type.second, function ( x ) {
            return zipContinuation( x ).second;
        }, body );
    } else if ( op === "one" ) {
        // Do nothing.
    } else if ( op === "plus" ) {
        eachTypeLeafNodeZipper( type.left, function ( x ) {
            return zipContinuation( x ).left;
        }, body );
        eachTypeLeafNodeZipper( type.right, function ( x ) {
            return zipContinuation( x ).right;
        }, body );
    } else if ( op === "zero" ) {
        // Do nothing.
    } else if ( op === "anytimeFn" ) {
        body( zipContinuation );
    } else {
        throw new Error();
    }
}

function eachTypeLeafNodeOver( var_args, body ) {
    if ( arguments.length < 2 )
        throw new Error();
    var args = _.arrCut( arguments );
    body = args.pop();
    eachTypeLeafNodeZipper( args[ 0 ], _.idfn, function ( get ) {
        body.apply( {}, [ get( args[ 0 ] ) ].concat(
            _.arrMap( args, function ( type ) {
                return get( type ).leafInfo;
            } ) ) );
    } );
}

function typePlusOffsetMillis( type, offsetMillis ) {
    if ( !isValidDuration( offsetMillis ) )
        throw new Error();
    return mapTypeLeafNodes( type, function ( type ) {
        if ( type.op === "atom" ) {
            return typeAtom(
                type.offsetMillis + offsetMillis, type.leafInfo );
        } else if ( type.op === "anytimeFn" ) {
            return type;
        } else {
            throw new Error();
        }
    } );
}

function mapTypeLeafInfo( type, func ) {
    return mapTypeLeafNodes( type, function ( type ) {
        if ( type.op === "atom" ) {
            return typeAtom( type.offsetMillis, func( type ) );
        } else if ( type.op === "anytimeFn" ) {
            return typeAnytimeFn(
                type.demand, type.response, func( type ) );
        } else {
            throw new Error();
        }
    } );
}

function makePairsForType( startMillis, type ) {
    var pairs = mapTypeLeafInfo( type, function ( type ) {
        if ( type.op === "atom" ) {
            return makeLinkedSigPair( startMillis );
        } else if ( type.op === "anytimeFn" ) {
            return makeAnytimeFnInstallationPair();
        } else {
            throw new Error();
        }
    } );
    var result = {};
    result.writables = mapTypeLeafInfo( pairs, function ( pair ) {
        return pair.leafInfo.writable;
    } );
    result.readables = mapTypeLeafInfo( pairs, function ( pair ) {
        return pair.leafInfo.readable;
    } );
    return result;
}

function makeOnBegin() {
    var begun = false;
    var funcs = [];
    
    var result = {};
    result.onBegin = function ( func ) {
        
        // If someone's accidentally using the same behavior
        // installation context to call onBegin even after the begin()
        // phase is underway, catch that mistake and throw an error.
        if ( begun )
            throw new Error();
        
        funcs.push( func );
    };
    result.begin = function () {
        var begun = true;
        for ( var n = funcs.length; n !== 0; n = funcs.length ) {
            funcs = _.arrRem( funcs, function ( func ) {
                return func();
            } );
            
            // If we're probably in an infinite loop, throw an error.
            if ( funcs.length === n )
                throw new Error();
        }
    };
    return result;
}

// ===== Behavior category ===========================================

function makeAnytimeFnInstallationPair() {
    var doStaticInvoke = null;
    var writable = {};
    writable.onStaticInvoke = function ( func ) {
        if ( doStaticInvoke !== null || func === null )
            throw new Error();
        doStaticInvoke = func;
    };
    writable.readFrom = function ( readable ) {
        // NOTE: This is just a convenience method for onStaticInvoke.
        writable.onStaticInvoke(
            function ( context, delayMillis, inSigs, outSigs ) {
            
            readable.doStaticInvoke(
                context, delayMillis, inSigs, outSigs );
        } );
    };
    var readable = {};
    readable.isConnected = function () {
        return doStaticInvoke !== null;
    };
    readable.doStaticInvoke = function (
        context, delayMillis, inSigs, outSigs ) {
        
        if ( doStaticInvoke === null )
            throw new Error();
        doStaticInvoke( context, delayMillis, inSigs, outSigs );
    };
    return { writable: writable, readable: readable };
}

// TODO: See what this would be called in Sirea.
function behId( type ) {
    var result = {};
    result.inType = type;
    result.outType = type;
    result.install = function ( context, inSigs, outSigs ) {
        eachTypeLeafNodeOver( inSigs, outSigs,
            function ( type, inSig, outSig ) {
            
            if ( type.op === "atom" ) {
                inSig.readEachEntry( function ( entry ) {
                    outSig.history.addEntry( entry );
                } );
            } else if ( type.op === "anytimeFn" ) {
                outSig.readFrom( inSig );
            } else {
                throw new Error();
            }
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
    result.install = function ( context, inSigs, outSigs ) {
        var pairs =
            makePairsForType( context.startMillis, behOne.outType );
        behOne.install( context, inSigs, pairs.writables );
        behTwo.install( context, pairs.readables, outSigs );
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
    result.install = function ( context, inSigs, outSigs ) {
        behId( type ).install( context, inSigs.first, outSigs );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behFstIntro( type ) {
    var result = {};
    result.inType = type;
    result.outType = typeTimes( type, typeOne() );
    result.install = function ( context, inSigs, outSigs ) {
        behId( type ).install( context, inSigs, outSigs.first );
    };
    return result;
}
function behFirst( beh, otherType ) {
    var result = {};
    result.inType = typeTimes( beh.inType, otherType );
    result.outType = typeTimes( beh.outType, otherType );
    result.install = function ( context, inSigs, outSigs ) {
        beh.install( context, inSigs.first, outSigs.first );
        behId( otherType ).install( context,
            inSigs.second, outSigs.second );
    };
    return result;
}
function behSwap( origFirstType, origSecondType ) {
    var result = {};
    result.inType = typeTimes( origFirstType, origSecondType );
    result.outType = typeTimes( origSecondType, origFirstType );
    result.install = function ( context, inSigs, outSigs ) {
        behId( origFirstType ).install( context,
            inSigs.first, outSigs.second );
        behId( origSecondType ).install( context,
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
    result.install = function ( context, inSigs, outSigs ) {
        behId( catcherType ).install( context,
            inSigs.first, outSigs.first.first );
        behId( ballType ).install( context,
            inSigs.second.first, outSigs.first.second );
        behId( pitcherType ).install( context,
            inSigs.second.second, outSigs.second );
    };
    return result;
}
function behDup( type ) {
    var result = {};
    result.inType = type;
    result.outType = typeTimes( type, type );
    result.install = function ( context, inSigs, outSigs ) {
        eachTypeLeafNodeOver( inSigs, outSigs.first, outSigs.second,
            function ( type, inSig, outSigFirst, outSigSecond ) {
            
            if ( type.op === "atom" ) {
                inSig.readEachEntry( function ( entry ) {
                    outSigFirst.history.addEntry( entry );
                    outSigSecond.history.addEntry( entry );
                } );
            } else if ( type.op === "anytimeFn" ) {
                outSigFirst.readFrom( inSig );
                outSigSecond.readFrom( inSig );
            } else {
                throw new Error();
            }
        } );
    };
    return result;
}
function behDrop( type ) {
    var result = {};
    result.inType = type;
    result.outType = typeOne();
    result.install = function ( context, inSigs, outSigs ) {
        eachTypeLeafNodeOver( inSigs, function ( type, inSig ) {
            if ( type.op === "atom" ) {
                inSig.readEachEntry( function ( entry ) {
                    // Do nothing.
                } );
            } else if ( type.op === "anytimeFn" ) {
                // Do nothing.
            } else {
                throw new Error();
            }
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
    result.install = function ( context, inSigs, outSigs ) {
        behId( type ).install( context, inSigs, outSigs.left );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behLeftElim( type ) {
    var result = {};
    result.inType = typePlus( type, typeZero() );
    result.outType = type;
    result.install = function ( context, inSigs, outSigs ) {
        behId( type ).install( context, inSigs.left, outSigs );
    };
    return result;
}
function behLeft( beh, otherType ) {
    var result = {};
    result.inType = typePlus( beh.inType, otherType );
    result.outType = typePlus( beh.outType, otherType );
    result.install = function ( context, inSigs, outSigs ) {
        beh.install( context, inSigs.left, outSigs.left );
        behId( otherType ).install( context,
            inSigs.right, outSigs.right );
    };
    return result;
}
function behMirror( origLeftType, origRightType ) {
    var result = {};
    result.inType = typeTimes( origLeftType, origRightType );
    result.outType = typeTimes( origRightType, origLeftType );
    result.install = function ( context, inSigs, outSigs ) {
        behId( origLeftType ).install( context,
            inSigs.left, outSigs.right );
        behId( origRightType ).install( context,
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
    result.install = function ( context, inSigs, outSigs ) {
        behId( pitcherType ).install( context,
            inSigs.left.left, outSigs.left );
        behId( ballType ).install( context,
            inSigs.left.right, outSigs.right.left );
        behId( catcherType ).install( context,
            inSigs.right, outSigs.right.right );
    };
    return result;
}
function behMerge( type ) {
    var result = {};
    result.inType = typePlus( type, type );
    result.outType = type;
    result.install = function ( context, inSigs, outSigs ) {
        eachTypeLeafNodeOver( inSigs.left, inSigs.right, outSigs,
            function ( type, inSigLeft, inSigRight, outSig ) {
            
            if ( type.op === "atom" ) {
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
            } else if ( type.op === "anytimeFn" ) {
                outSig.onStaticInvoke( function (
                    context, delayMillis, inSigs, outSigs ) {
                    
                    var outSigLeftPairs = makePairsForType(
                        context.startMillis, type.response );
                    var outSigRightPairs = makePairsForType(
                        context.startMillis, type.response );
                    
                    // Split the inputs.
                    //
                    // NOTE: We send the inputs to both merged
                    // behaviors. In order to avoid violations of
                    // duration coupling, every implementation of
                    // onStaticInvoke/doStaticInvoke must filter its
                    // input signal according to the true activity
                    // profile of the behavior-carrying signal.
                    //
                    // The typePlus() operator represents a choice the
                    // downstream code can't control but the upstream
                    // code can, so we shunt the filtering
                    // responsibility upstream.
                    //
                    inSigLeft.doStaticInvoke( context, delayMillis,
                        inSigs, outSigLeftPairs.writable );
                    inSigRight.doStaticInvoke( context, delayMillis,
                        inSigs, outSigRightPairs.writable );
                    
                    // Merge the outputs.
                    //
                    // Marvel at this convoluted recurrence.
                    //
                    behMerge( type.response ).install( context,
                        typePlus(
                            outSigLeftPairs.readable,
                            outSigRightPairs.readable ),
                        outSigs );
                } );
            } else {
                throw new Error();
            }
            
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
    result.install = function ( context, inSigs, outSigs ) {
        eachTypeLeafNodeOver( outSigs, function ( type, outSig ) {
            if ( type.op === "atom" ) {
                context.onBegin( function () {
                    outSig.history.finishData( context.startMillis );
                    return !!"wasAbleToFinish";
                } );
            } else if ( type.op === "anytimeFn" ) {
                ignoreAnytimeFn( outSig );
            } else {
                throw new Error();
            }
            
            function ignoreAnytimeFn( outSig ) {
                outSig.onStaticInvoke( function (
                    context, delayMillis, inSigs, outSigs ) {
                    
                    eachTypeLeafNodeOver( inSigs, outSigs,
                        function ( type, inSig, outSig ) {
                        
                        if ( type.op === "atom" ) {
                            inSig.readEachEntry( function ( entry ) {
                                // Do nothing. The implementation of
                                // behMerge on behavior-carrying
                                // signals sends the input to both of
                                // the merged behaviors, expecting
                                // them to filter based on their
                                // signal's activity profile. We're
                                // doing one case of that filtering
                                // right now, by ignoring all inputs
                                // since this behavior-carrying signal
                                // is forever inactive.
                            } );
                            context.onBegin( function () {
                                outSig.history.finishData(
                                    context.startMillis );
                                return !!"wasAbleToFinish";
                            } );
                        } else if ( type.op === "anytimeFn" ) {
                            // TODO: Figure out if we should really be
                            // ignoring recursively here. Will vacuous
                            // anytimeFns this deep even need to be
                            // handled in the first place? And if they
                            // will, would it be better to just let it
                            // happen using outSig.readFrom( inSig )?
                            ignoreAnytimeFn( outSig );
                        } else {
                            throw new Error();
                        }
                    } );
                } );
            }
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
    function getAllAtomNodes( branchType ) {
        return _.acc( function ( y ) {
            eachTypeLeafNode( branchType, function ( type ) {
                if ( type.op === "atom" ) {
                    y( type );
                } else if ( type.op === "anytimeFn" ) {
                    // Do nothing.
                } else {
                    throw new Error();
                }
            } );
        } );
    }
    var branchAtomNodes = getAllAtomNodes( branchType );
    var leftAtomNodes = getAllAtomNodes( leftType );
    var rightAtomNodes = getAllAtomNodes( rightType );
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
    result.install = function ( context, inSigs, outSigs ) {
        var bins = [];
        function getBin( offsetMillis ) {
            return _.arrAny( bins, function ( bin ) {
                return bin.offsetMillis === offsetMillis;
            } );
        }
        eachTypeLeafNodeOver(
            inSigs.first, outSigs.left.first, outSigs.right.first,
            function ( type, inSig, outSigLeft, outSigRight ) {
            
            if ( type.op === "atom" ) {
                var bin = getBin( type.offsetMillis );
                if ( !bin ) {
                    bin = {
                        offsetMillis: type.offsetMillis,
                        branchesPending: []
                    };
                    bins.push( bin );
                }
                var pending = [];
                bin.branchesPending.push( {
                    outSigLeft: outSigLeft,
                    outSigRight: outSigRight,
                    conditionPending: new ActivityHistory().init( {
                        startMillis: context.startMillis,
                        syncOnAdd: function () {
                            // Do nothing.
                        },
                        syncOnForget: function () {
                            // Do nothing.
                        }
                    } ),
                    dataPending: pending
                } );
                inSig.readEachEntry( function ( entry ) {
                    pending.push( entry );
                    processPending();
                } );
            } else if ( type.op === "anytimeFn" ) {
                outSigLeft.readFrom( inSig );
                outSigRight.readFrom( inSig );
            } else {
                throw new Error();
            }
        } );
        
        function eachOnOneSide(
            condition, oppositeCondition, type, inSigs, outSigs ) {
            
            eachTypeLeafNodeOver( inSigs, outSigs,
                function ( type, inSig, outSig ) {
                
                if ( type.op === "atom" ) {
                    var bin = getBin( type.offsetMillis );
                    inSig.readEachEntry( function ( entry ) {
                        outSig.history.addEntry( entry );
                        if ( bin ) {
                            // NOTE: Inactivity on one side
                            // essentially counts as activity on the
                            // other side, so we track the branched
                            // activity profile in a single
                            // always-active history. It'll be masked
                            // by the branching signal's activity
                            // profile later on.
                            var conditionEntry = {
                                maybeData:
                                    { val: entry.maybeData === null ?
                                        oppositeCondition :
                                        condition },
                                startMillis: entry.startMillis,
                                maybeEndMillis: entry.maybeEndMillis
                            };
                            _.arrEach( bin.branchesPending,
                                function ( branch ) {
                                
                                branch.conditionPending.addEntry(
                                    conditionEntry );
                            } );
                            processPending();
                        }
                    } );
                } else if ( type.op === "anytimeFn" ) {
                    outSig.readFrom( inSig );
                } else {
                    throw new Error();
                }
            } );
        }
        eachOnOneSide( "left", "right", leftType,
            inSigs.second.left, outSigs.left.second );
        eachOnOneSide( "right", "left", rightType,
            inSigs.second.right, outSigs.right.second );
        
        function processPending() {
            _.arrEach( bins, function ( bin ) {
                _.arrEach( bin.branchesPending, function ( branch ) {
                    
                    // TODO: See if we should really copy the Array
                    // here, since getAllEntries() already does it.
                    var conditionPending = branch.conditionPending.
                        getAllEntries().slice();
                    
                    consumeEarliestEntries( [
                        conditionPending,
                        branch.dataPending
                    ], function ( earliestEntries ) {
                        var conditionEntry = earliestEntries[ 0 ];
                        var dataEntry = earliestEntries[ 1 ];
                        
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
                            
                        } else if ( conditionEntry.maybeData.val ===
                            "left" ) {
                            
                            branch.outSigLeft.history.addEntry(
                                dataEntry );
                            branch.outSigRight.history.addEntry(
                                nullEntry );
                            
                        } else if ( conditionEntry.maybeData.val ===
                            "right" ) {
                            
                            branch.outSigLeft.history.addEntry(
                                nullEntry );
                            branch.outSigRight.history.addEntry(
                                dataEntry );
                        } else {
                            throw new Error();
                        }
                    } );
                    branch.conditionPending.forgetBeforeMillis(
                        entsEnd( conditionPending ) );
                } );
            } );
        }
    };
    return result;
}


// ===== Other behavior operations ===================================

// TODO: Actually implement some first-class behaviors we can call!
function behCall( funcType ) {
    if ( funcType.op !== "anytimeFn" )
        throw new Error();
    var result = {};
    result.inType = typeTimes( funcType, funcType.demand );
    result.outType = funcType.response;
    result.install = function ( context, inSigs, outSigs ) {
        var inSigFunc = inSigs.first.leafInfo;
        var inSigParam = inSigs.second;
        context.onBegin( function () {
            // TODO: See if we end up entering an infinite loop with
            // this.
            if ( !inSigFunc.isConnected() )
                return !"wasAbleToFinish";
            
            var delayMillis = 0;
            var onBeginObj = makeOnBegin();
            inSigFunc.doStaticInvoke( {
                startMillis: context.startMillis,
                membrane: context.membrane,
                onBegin: onBeginObj.onBegin
            }, delayMillis, inSigParam, outSigs );
            onBeginObj.begin();
            
            return !!"wasAbleToFinish";
        } );
    };
    return result;
}

function behDelay( delayMillis, type ) {
    if ( !isValidDuration( delayMillis ) )
        throw new Error();
    var result = {};
    result.inType = type;
    result.outType = typePlusOffsetMillis( type, delayMillis );
    result.install = function ( context, inSigs, outSigs ) {
        eachTypeLeafNodeOver( inSigs, outSigs,
            function ( type, inSig, outSig ) {
            
            if ( type.op === "atom" ) {
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
            } else if ( type.op === "anytimeFn" ) {
                outSig.onStaticInvoke( function (
                    context, totalDelayMillis, inSigs, outSigs ) {
                    
                    inSig.doStaticInvoke(
                        context, totalDelayMillis + delayMillis,
                        inSigs, outSigs );
                } );
            } else {
                throw new Error();
            }
        } );
    };
    return result;
}

function behFmap( func ) {
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType = typeAtom( 0, null );
    result.install = function ( context, inSigs, outSigs ) {
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
    result.install = function ( context, inSigs, outSigs ) {
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
    result.install = function ( context, inSigs, outSigs ) {
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

// TODO: See what this would be called in Sirea, if anything.
//
// NOTE: This behavior waits as long as the membrane does to receive
// its response. If the membrane needs to access some unreliable
// external system, it should hide that unreliability. If the membrane
// doesn't preserve duration coupling, this will pretend it responded
// with a dummy value.
//
function behYield( delayMillis ) {
    if ( !isValidDuration( delayMillis ) )
        throw new Error();
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType = typeAtom( delayMillis, null );
    result.install = function ( context, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        var outSig = outSigs.leafInfo;
        
        var demander = context.membrane.getNewOutDemander(
            context.startMillis, delayMillis,
            function () {  // syncOnResponseAvailable
                _.arrEach( getAndForgetDemanderResponse( demander ),
                    function ( entry ) {
                    
                    outSig.history.addEntry( {
                        maybeData: entry.maybeData === null ? null :
                            { val: entry.maybeData.val.length === 1 ?
                                [] : entry.maybeData.val[ 1 ] },
                        startMillis: entry.startMillis,
                        maybeEndMillis: entry.maybeEndMillis
                    } );
                } );
            } );
        
        inSig.readEachEntry( function ( entry ) {
            if ( entry.maybeEndMillis === null )
                demander.finishDemand( entry.startMillis );
            else if ( entry.maybeData === null )
                demander.suspendDemand(
                    entry.startMillis, entry.maybeEndMillis.val );
            else
                demander.setDemand( entry.maybeData.val,
                    entry.startMillis, entry.maybeEndMillis.val );
        } );
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
//
// Sirea also has some tools for managing the state of Haskell's lazy
// evaluation thunks, but this implementation manages only eager,
// serializable data, so they're not as relevant here.


// ===== Ad hoc side effects =========================================

function behMouseQuery() {
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType = typeAtom( 0, null );
    result.install = function ( context, inSigs, outSigs ) {
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
    result.install = function ( context, inSigs, outSigs ) {
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
    function deferForBatching( func ) {
        setTimeout( function () {
            func();
        }, 0 );
    }
    var membranePair =
        makeLinkedMembranePair( nowMillis, deferForBatching );
    membranePair.a.syncOnInDemandAvailable( function () {
        explicitlyIgnoreMembraneDemand( membranePair.a.membrane );
    } );
    membranePair.b.syncOnInDemandAvailable( function () {
        explicitlyIgnoreMembraneDemand( membranePair.b.membrane );
    } );
    var onBeginObj = makeOnBegin();
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
    ).install(
        {
            startMillis: nowMillis,
            membrane: membranePair.b.membrane,
            onBegin: onBeginObj.onBegin
        },
        typeAtom( 0, step1.readable ),
        typeAtom( mouseDelayMillis, step2.writable ) );
    onBeginObj.begin();
    step2.readable.readEachEntry( function ( entry ) {
        // Do nothing.
    } );
    
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 10;
    var stabilityMillis = 500;  // 20;
    var otherOutStabilityMillis = 1000000;
    setInterval( function () {
        var nowMillis = new Date().getTime();
        step1.writable.history.setData(
            JSON.stringify( measurementDelayMillis ),
            nowMillis, nowMillis + stabilityMillis );
        membranePair.a.membrane.raiseOtherOutPermanentUntilMillis(
            nowMillis + otherOutStabilityMillis );
        membranePair.b.membrane.raiseOtherOutPermanentUntilMillis(
            nowMillis + otherOutStabilityMillis );
    }, intervalMillis );
    
    return { dom: dom };
}
