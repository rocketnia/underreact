// underreact-behaviors.js

// Copyright (c) 2013, Ross Angle
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
// * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//
// * Redistributions in binary form must reproduce the above copyright
// notice, this list of conditions and the following disclaimer in the
// documentation and/or other materials provided with the
// distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.


function UnderreactType() {}
UnderreactType.prototype.init_ = function ( properties ) {
    var self = this;
    _.objOwnEach( properties, function ( k, v ) {
        self[ k ] = v;
    } );
    return self;
};

// NOTE: The leafInfo parameters aren't actually part of the types for
// equality purposes, but we use them to annotate the type tree with
// metadata.
function typeAtom( offsetMillis, leafInfo ) {
    if ( !isValidDuration( offsetMillis ) )
        throw new Error();
    return new UnderreactType().init_( { op: "atom",
        offsetMillis: offsetMillis, leafInfo: leafInfo } );
}
function typeTimes( first, second ) {
    if ( !(first instanceof UnderreactType) )
        throw new Error();
    if ( !(second instanceof UnderreactType) )
        throw new Error();
    return new UnderreactType().init_( { op: "times",
        first: first, second: second } );
}
function typeOne() {
    return new UnderreactType().init_( { op: "one" } );
}
function typePlus( left, right ) {
    if ( !(left instanceof UnderreactType) )
        throw new Error();
    if ( !(right instanceof UnderreactType) )
        throw new Error();
    return new UnderreactType().init_( { op: "plus",
        left: left, right: right } );
}
function typeZero() {
    return new UnderreactType().init_( { op: "zero" } );
}
function typeAnytimeFn( demand, response, leafInfo ) {
    if ( !(demand instanceof UnderreactType) )
        throw new Error();
    if ( !(response instanceof UnderreactType) )
        throw new Error();
    return new UnderreactType().init_( { op: "anytimeFn",
        demand: demand, response: response, leafInfo: leafInfo } );
}

function typeIsStaticList( type ) {
    var op = type.op;
    if ( op === "atom" ) {
        return false;
    } else if ( op === "times" ) {
        return typeIsStaticList( type.second );
    } else if ( op === "one" ) {
        return true;
    } else if ( op === "plus" ) {
        return false;
    } else if ( op === "zero" ) {
        return false;
    } else if ( op === "anytimeFn" ) {
        return false;
    } else {
        throw new Error();
    }
}

function typeToString( type ) {
    var op = type.op;
    if ( op === "atom" ) {
        return "A" + type.offsetMillis;
    } else if ( op === "times" ) {
        if ( typeIsStaticList( type ) ) {
            var innerResults = [];
            for ( var t = type; t.op === "times"; t = t.second )
                innerResults.push( typeToString( t.first ) );
            return "[ " + innerResults.join( ", " ) + " ]";
        }
        return "(" + typeToString( type.first ) + " * " +
            typeToString( type.second ) + ")";
    } else if ( op === "one" ) {
        return "1";
    } else if ( op === "plus" ) {
        return "(" + typeToString( type.left ) + " + " +
            typeToString( type.right ) + ")";
    } else if ( op === "zero" ) {
        return "0";
    } else if ( op === "anytimeFn" ) {
        return "(" + typeToString( type.demand ) + " -> " +
            typeToString( type.response ) + ")";
    } else {
        throw new Error();
    }
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
            typesToCompare.push(
                { a: types.a.demand, b: types.b.demand } );
            typesToCompare.push(
                { a: types.a.response, b: types.b.response } );
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
                types.a.offsetMillis - types.b.offsetMillis;
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
            typesToCompare.push(
                { a: types.a.demand, b: types.b.demand } );
            typesToCompare.push(
                { a: types.a.response, b: types.b.response } );
        } else {
            throw new Error();
        }
    }
    return { offsetMillis: offsetMillis };
}

function getAllCoordinates( type ) {
    return _.acc( function ( y ) {
        eachTypeLeafNodeOver( type, function ( type ) {
            if ( type.op === "atom" ) {
                y( { offsetMillis: type.offsetMillis } );
            } else if ( type.op === "anytimeFn" ) {
                _.arrEach( getAllCoordinates( type.demand ),
                    function ( coordinates ) {
                    
                    y( coordinates );
                } );
            } else {
                throw new Error();
            }
        } );
    } );
}

function typesSupplyActivityEvidence(
    knownActivityTypes, unknownActivityType ) {
    
    var knownActivityCoordinates =
        _.arrMappend( knownActivityTypes, function ( type ) {
            return getAllCoordinates( type );
        } );
    var unknownActivityCoordinates =
        getAllCoordinates( unknownActivityType );
    return _.arrAll( unknownActivityCoordinates,
        function ( unknownActivityCoordinate ) {
        
        return _.arrAny( knownActivityCoordinates,
            function ( knownActivityCoordinate ) {
            
            // NOTE: In general, we should also check that the
            // partitions match.
            return unknownActivityCoordinate.offsetMillis ===
                knownActivityCoordinate.offsetMillis;
        } );
    } );
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

function typePlusOffsetMillis( offsetMillis, type ) {
    if ( !isValidDuration( offsetMillis ) )
        throw new Error();
    return mapTypeLeafNodes( type, function ( type ) {
        if ( type.op === "atom" ) {
            return typeAtom(
                type.offsetMillis + offsetMillis, type.leafInfo );
        } else if ( type.op === "anytimeFn" ) {
            return typeAnytimeFn(
                typePlusOffsetMillis( offsetMillis, type.demand ),
                typePlusOffsetMillis( offsetMillis, type.response ),
                type.leafInfo );
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

function stripType( type ) {
    return mapTypeLeafInfo( type, function ( type ) {
        if ( type.op === "atom" ) {
            return null;
        } else if ( type.op === "anytimeFn" ) {
            return null;
        } else {
            throw new Error();
        }
    } );
}

function makeOffsetMillisMap() {
    return new Map().init( {
        keyHash: function ( k ) {
            return "" + k;
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return _.sameTwo( a, b );
        }
    } );
}

function makeAnytimeFnInstallationPair( startMillis, type ) {
    var doStaticInvoke = null;
    var connectionDependencies = [];
    var connectionDependenciesSealed = false;
    
    var writable = {};
    writable.addConnectionDependency = function ( dependency ) {
        if ( connectionDependenciesSealed )
            throw new Error();
        connectionDependencies.push( dependency );
    };
    // TODO TRAMPOLINE: Instead of using addOnlyConnectionDependency,
    // use a trampoline during isConnected.
    writable.addOnlyConnectionDependency = function ( dependency ) {
        if ( connectionDependenciesSealed )
            throw new Error();
        if ( connectionDependencies.length !== 0 )
            throw new Error();
        readable.isConnected = dependency.isConnected;
        // NOTE: We still keep track of our own connectionDependencies
        // just in case someone else stole our isConnected before we
        // could steal dependency.isConnected.
        // TODO: Make even that case costless.
        connectionDependencies.push( dependency );
        connectionDependenciesSealed = true;
    };
    writable.onStaticInvoke = function ( func ) {
        if ( doStaticInvoke !== null || func === null )
            throw new Error();
        doStaticInvoke = func;
    };
    writable.readFrom = function ( readable ) {
        // NOTE: This is just a convenience method.
        
        writable.addOnlyConnectionDependency( readable );
        writable.onStaticInvoke(
            function ( context, delayMillis, inWires, outWires ) {
            
            // TODO TRAMPOLINE: Stop using onBegin as a trampoline,
            // and use a more dedicated trampolining technique as seen
            // in Era.
            context.onBegin( function () {
                readable.doStaticInvoke(
                    context, delayMillis, inWires, outWires );
                return !!"wasAbleToFinish";
            } );
        } );
    };
    
    var readable = {};
    readable.isConnected = function () {
        return doStaticInvoke !== null &&
            _.arrAll( connectionDependencies, function ( dep ) {
                return dep.isConnected();
            } );
    };
    readable.doStaticInvoke = function (
        context, delayMillis, inWires, outWires ) {
        
        if ( doStaticInvoke === null )
            throw new Error();
        doStaticInvoke( context, delayMillis, inWires, outWires );
    };
    
    return { writable: writable, readable: readable };
}

function makePairsForType( context, type ) {
    var pairs = mapTypeLeafInfo( type, function ( type ) {
        if ( type.op === "atom" ) {
            return makeLinkedWirePair( context, context.startMillis );
        } else if ( type.op === "anytimeFn" ) {
            return makeAnytimeFnInstallationPair(
                context.startMillis, type );
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

function makeContext( startMillis, membrane ) {
    var onBeginListeners = [];
    var onTimeToMakeSigsListeners = [];
    var onSigsReadyListeners = [];
    
    var result = {};
    result.context = {};
    result.context.startMillis = startMillis;
    result.context.membrane = membrane;
    result.context.onBegin = function ( func ) {
        
        // If someone's accidentally using the same behavior
        // installation context to call onBegin even after the begin()
        // phase is underway, catch that mistake and throw an error.
        if ( onBeginListeners === null )
            throw new Error();
        
        onBeginListeners.push( func );
    };
    result.context.onTimeToMakeSigs = function ( func ) {
        if ( onBeginListeners === null )
            throw new Error();
        onTimeToMakeSigsListeners.push( func );
    };
    result.context.onSigsReady = function ( func ) {
        if ( onBeginListeners === null )
            throw new Error();
        onSigsReadyListeners.push( func );
    };
    result.begin = function () {
        if ( onBeginListeners === null )
            throw new Error();
        for ( var n = onBeginListeners.length;
            n !== 0;
            n = onBeginListeners.length ) {
            
            var nextOnBeginListeners = [];
            while ( onBeginListeners.length !== 0 ) {
                var func = onBeginListeners.shift();
                if ( !func() )
                    nextOnBeginListeners.push( func );
            }
            onBeginListeners = nextOnBeginListeners;
            // NOTE: We currently can't use this implementation
            // because the functions may call onBegin again. See one
            // of the other comments labeled "TODO TRAMPOLINE".
//            onBeginListeners = _.arrRem( onBeginListeners,
//                function ( func ) {
//                
//                return func();
//            } );
            
            // If we're probably in an infinite loop, throw an error.
            if ( onBeginListeners.length === n )
                throw new Error();
        }
        onBeginListeners = null;
    };
    result.timeToMakeSigs = function () {
        if ( onTimeToMakeSigsListeners === null )
            throw new Error();  // too late
        if ( onBeginListeners !== null )
            throw new Error();  // too early
        _.arrEach( onTimeToMakeSigsListeners, function ( func ) {
            func();
        } );
        onTimeToMakeSigsListeners = null;
    };
    result.sigsReady = function () {
        if ( onSigsReadyListeners === null )
            throw new Error();  // too late
        if ( onTimeToMakeSigsListeners !== null )
            throw new Error();  // too early
        _.arrEach( onSigsReadyListeners, function ( func ) {
            func();
        } );
        onSigsReadyListeners = null;
    };
    return result;
}

function makeSubcontext( parentContext, startMillis ) {
    var result = makeContext( startMillis, parentContext.membrane );
    parentContext.onTimeToMakeSigs( function () {
        result.timeToMakeSigs();
    } );
    parentContext.onSigsReady( function () {
        result.sigsReady();
    } );
    return { context: result.context, begin: result.begin };
}

// ===== Behavior category ===========================================

// TODO: See what this would be called in Sirea.
function behId( type ) {
    var result = {};
    result.inType = type;
    result.outType = type;
    result.install = function ( context, inWires, outWires ) {
        eachTypeLeafNodeOver( inWires, outWires,
            function ( type, inWire, outWire ) {
            
            if ( type.op === "atom" ) {
                outWire.readSigFrom( inWire );
            } else if ( type.op === "anytimeFn" ) {
                outWire.readFrom( inWire );
            } else {
                throw new Error();
            }
        } );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behSeq( behOne, behTwo ) {
    // TODO: This seems to work just fine when typesUnify's parameters
    // are switched. Figure out why.
    var diff = typesUnify( behOne.outType, behTwo.inType );
    if ( diff === null )
        throw new Error();
    
    var result = {};
    result.inType = behOne.inType;
    result.outType = diff.offsetMillis === null ? behTwo.outType :
        typePlusOffsetMillis( diff.offsetMillis, behTwo.outType );
    result.install = function ( context, inWires, outWires ) {
        var pairs = makePairsForType( context, behOne.outType );
        behOne.install( context, inWires, pairs.writables );
        behTwo.install( context, pairs.readables, outWires );
    };
    return result;
}
function behSeqsArr( arr ) {
    if ( arr.length === 0 )
        throw new Error();
    return _.arrFoldl( arr[ 0 ], _.arrCut( arr, 1 ),
        function ( a, b ) {
            return behSeq( a, b );
        } );
}
function behSeqs( first, var_args ) {
    return behSeqsArr( _.arrCut( arguments ) );
}


// ===== Behavior product ============================================

// TODO: See what this would be called in Sirea.
function behFstElim( type ) {
    var result = {};
    result.inType = typeTimes( type, typeOne() );
    result.outType = type;
    result.install = function ( context, inWires, outWires ) {
        behId( type ).install( context, inWires.first, outWires );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behFstIntro( type ) {
    var result = {};
    result.inType = type;
    result.outType = typeTimes( type, typeOne() );
    result.install = function ( context, inWires, outWires ) {
        behId( type ).install( context, inWires, outWires.first );
    };
    return result;
}
function behFirst( beh, otherType ) {
    var result = {};
    result.inType = typeTimes( beh.inType, otherType );
    result.outType = typeTimes( beh.outType, otherType );
    result.install = function ( context, inWires, outWires ) {
        beh.install( context, inWires.first, outWires.first );
        behId( otherType ).install( context,
            inWires.second, outWires.second );
    };
    return result;
}
function behSwap( origFirstType, origSecondType ) {
    var result = {};
    result.inType = typeTimes( origFirstType, origSecondType );
    result.outType = typeTimes( origSecondType, origFirstType );
    result.install = function ( context, inWires, outWires ) {
        behId( origFirstType ).install( context,
            inWires.first, outWires.second );
        behId( origSecondType ).install( context,
            inWires.second, outWires.first );
    };
    return result;
}
function behAssoclp( catcherType, ballType, pitcherType ) {
    var result = {};
    result.inType =
        typeTimes( catcherType, typeTimes( ballType, pitcherType ) );
    result.outType =
        typeTimes( typeTimes( catcherType, ballType ), pitcherType );
    result.install = function ( context, inWires, outWires ) {
        behId( catcherType ).install( context,
            inWires.first, outWires.first.first );
        behId( ballType ).install( context,
            inWires.second.first, outWires.first.second );
        behId( pitcherType ).install( context,
            inWires.second.second, outWires.second );
    };
    return result;
}
function behDup( type ) {
    var result = {};
    result.inType = type;
    result.outType = typeTimes( type, type );
    result.install = function ( context, inWires, outWires ) {
        eachTypeLeafNodeOver(
            inWires, outWires.first, outWires.second,
            function ( type, inWire, outWireFirst, outWireSecond ) {
            
            if ( type.op === "atom" ) {
                context.onSigsReady( function () {
                    inWire.sig.readEachEntry( function ( entry ) {
                        outWireFirst.sig.history.addEntry( entry );
                        outWireSecond.sig.history.addEntry( entry );
                    } );
                } );
            } else if ( type.op === "anytimeFn" ) {
                outWireFirst.readFrom( inWire );
                outWireSecond.readFrom( inWire );
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
    result.install = function ( context, inWires, outWires ) {
        eachTypeLeafNodeOver( inWires, function ( type, inWire ) {
            if ( type.op === "atom" ) {
                context.onSigsReady( function () {
                    inWire.sig.readEachEntry( function ( entry ) {
                        // Do nothing.
                    } );
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
        var endMillis = _.arrFoldl( 1 / 0, earliestEntries,
            function ( endMillis, entry ) {
            
            return Math.min( endMillis, entEnd( entry ) );
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

// TODO: See if this would come in handy in more places. Right now we
// only use it once, and that's just an optimization.
function consumeEarliestEntriesCapped(
    earliestStartMillis, pendingHistories, body ) {
    
    _.arrEach( pendingHistories, function ( pending ) {
        while ( pending.length !== 0
            && entEnd( pending[ 0 ] ) <= earliestStartMillis )
            pending.shift();
    } );
    consumeEarliestEntries( pendingHistories, body );
}

// TODO: See what this would be called in Sirea.
function behLeftIntro( type ) {
    var result = {};
    result.inType = type;
    result.outType = typePlus( type, typeZero() );
    result.install = function ( context, inWires, outWires ) {
        behId( type ).install( context, inWires, outWires.left );
    };
    return result;
}
// TODO: See what this would be called in Sirea.
function behLeftElim( type ) {
    var result = {};
    result.inType = typePlus( type, typeZero() );
    result.outType = type;
    result.install = function ( context, inWires, outWires ) {
        behId( type ).install( context, inWires.left, outWires );
    };
    return result;
}
function behLeft( beh, otherType ) {
    var result = {};
    result.inType = typePlus( beh.inType, otherType );
    result.outType = typePlus( beh.outType, otherType );
    result.install = function ( context, inWires, outWires ) {
        beh.install( context, inWires.left, outWires.left );
        behId( otherType ).install( context,
            inWires.right, outWires.right );
    };
    return result;
}
function behMirror( origLeftType, origRightType ) {
    var result = {};
    result.inType = typePlus( origLeftType, origRightType );
    result.outType = typePlus( origRightType, origLeftType );
    result.install = function ( context, inWires, outWires ) {
        behId( origLeftType ).install( context,
            inWires.left, outWires.right );
        behId( origRightType ).install( context,
            inWires.right, outWires.left );
    };
    return result;
}
function behAssocrs( pitcherType, ballType, catcherType ) {
    var result = {};
    result.inType =
        typePlus( typePlus( pitcherType, ballType ), catcherType );
    result.outType =
        typePlus( pitcherType, typePlus( ballType, catcherType ) );
    result.install = function ( context, inWires, outWires ) {
        behId( pitcherType ).install( context,
            inWires.left.left, outWires.left );
        behId( ballType ).install( context,
            inWires.left.right, outWires.right.left );
        behId( catcherType ).install( context,
            inWires.right, outWires.right.right );
    };
    return result;
}

// NOTE: Observe that the following progression of types cannot
// correspond to a valid program:
//
// (1 + 1) * x
// ((x -> x) + (x -> x)) * x  -- introduce tautologies
// (x -> x) * x  -- behMerge
// x  -- behCall
//
// The problem is that we can't determine which (x -> x) is called at
// any given time offset, because that information (1 + 1) is not
// observable in the partitions that are passing in x (or to any other
// partition, for that matter).
//
// To overcome this, we have an extra requirement when doing a
// behMerge: The signals being merged must be active in enough
// (partition, time offset) coordinates to act as a filter for any
// inputs. For instance, we can't merge two (x -> x) signals, but we
// can merge two (x * (x -> x)) signals. Because of this, developers
// may find it easiest to deal with first-class behaviors if they
// bundle them up in the form (activity * (x -> y)).
//
// Notice that we need to filter the input type, but there's no
// corresponding requirement for the output type. If we were to
// generalize signals to be bidirectional (i.e. so that some atomic
// signals go backwards in time and we have linear-logic-like duals of
// * and +), then we would indeed treat the input and output signal
// symmetrically. We would then filter every input or output signal
// going backwards in time--but not the ones going forwards in time.
//
// (TODO: Both the inputs and the outputs are under an exponential in
// linear logic terms, since (x -> y) can be invoked any number of
// times. Figure out whether we'd also need to prohibit merges like
// (-x * -x), where the backwards-going signals are not under an
// exponential.)
//
function behMerge( type ) {
    var informantsAvailable = makeOffsetMillisMap();
    var informantsNeeded = makeOffsetMillisMap();
    eachTypeLeafNodeOver( type, function ( type, unused ) {
        if ( type.op === "atom" ) {
            informantsAvailable.set( type.offsetMillis, true );
        } else if ( type.op === "anytimeFn" ) {
            eachTypeLeafNodeOver( type.demand,
                function ( type, unused ) {
                
                if ( type.op === "atom" ) {
                    informantsNeeded.set( type.offsetMillis, true );
                } else if ( type.op === "anytimeFn" ) {
                    // Do nothing.
                } else {
                    throw new Error();
                }
            } );
        } else {
            throw new Error();
        }
    } );
    if ( informantsNeeded.any( function ( offsetMillis, unused ) {
        return !informantsAvailable.has( offsetMillis );
    } ) )
        throw new Error();
    
    var result = {};
    result.inType = typePlus( type, type );
    result.outType = type;
    result.install = function ( context, inWires, outWires ) {
        var activityWiresType = typeOne();
        var leftActivityWires = typeOne();
        var rightActivityWires = typeOne();
        var informantGroups = informantsNeeded.map(
            function ( unused, offsetMillis ) {
            
            activityWiresType = typeTimes(
                typeAtom( offsetMillis, null ), activityWiresType );
            // TODO: See if this is the right startMillis to use.
            var leftPair =
                makeLinkedWirePair( context, context.startMillis );
            leftActivityWires = typeTimes(
                typeAtom( offsetMillis, leftPair.readable ),
                leftActivityWires );
            // TODO: See if this is the right startMillis to use.
            var rightPair =
                makeLinkedWirePair( context, context.startMillis );
            rightActivityWires = typeTimes(
                typeAtom( offsetMillis, rightPair.readable ),
                rightActivityWires );
            var activityWritables = {};
            activityWritable[ "left" ] = leftPair.writable;
            activityWritable[ "right" ] = rightPair.writable;
            return {
                activityWritables: activityWritables,
                pending: []
            };
        } );
        function addInformantPair( offsetMillis ) {
            if ( !informantGroups.has( offsetMillis ) )
                return false;
            var result = {};
            _.arrEach( [ "left", "right" ], function ( condition ) {
                informantGroups.get( offsetMillis ).pending.push( {
                    condition: condition,
                    history: result[ condition ] =
                        new ActivityHistory().init( {
                            startMillis: context.startMillis
                        } )
                } );
            } );
            return result;
        }
        function dupActivityWires() {
            function dup( activityWires ) {
                var dupFirst =
                    makePairsForType( context, activityWires );
                var dupSecond =
                    makePairsForType( context, activityWires );
                behDup( activityWiresType ).install(
                    context, activityWires,
                    typeTimes(
                        dupFirst.writables, dupSecond.writables ) );
                return { first: dupFirst.readables,
                    second: dupSecond.readables };
            }
            var leftDup = dup( leftActivityWires );
            var rightDup = dup( rightActivityWires );
            leftActivityWires = leftDup.second;
            rightActivityWires = rightDup.second;
            return typePlus( leftDup.first, rightDup.first );
        }
        
        function otherCond( condition ) {
            return condition === "left" ? "right" : "left";
        }
        
        function processInformantsPending( offsetMillis ) {
            var informantGroup = informantGroups.get( offsetMillis );
            var informants = informantGroup.pending;
            do {
                var didSomething = false;
                
                var addConditionEntry = function ( entry ) {
                    didSomething = true;
                    var endMillis = entEnd( entry );
                    _.arrEach( informants, function ( informant ) {
                        informant.forgetBeforeMillis( endMillis );
                    } );
                    _.arrEach( [ "left", "right" ],
                        function ( condition ) {
                        
                        informantGroup.activityWritables[ condition
                            ].history.addEntry( {
                                maybeData:
                                    entry.maybeData === null ? null :
                                    entry.maybeData.val ===
                                        condition ?
                                        { val: [] } : null,
                                startMillis: entry.startMillis,
                                maybeEndMillis: entry.maybeEndMillis
                            } );
                    } );
                };
                
                _.arrEach( [ "left", "right" ],
                    function ( condition ) {
                    
                    var startMillis = bin.informants[ 0
                        ].history.getFirstEntry().startMillis;
                    
                    var anyAffirmative = arrMax( bin.informants,
                        function ( it ) {
                        
                        if ( it.condition !== condition )
                            return -1 / 0;
                        if ( it.history.isEmpty() )
                            return -1 / 0;
                        var entry = it.history.getFirstEntry();
                        if ( entry.maybeData === null )
                            return -1 / 0;
                        return entEnd( entry );
                    } );
                    if ( anyAffirmative !== -1 / 0 )
                        addConditionEntry( {
                            maybeData: { val: condition },
                            startMillis: startMillis,
                            maybeEndMillis:
                                { val: anyAffirmative }
                        } );
                    
                    var bothInactive = arrMin( bin.informants,
                        function ( it ) {
                        
                        if ( it.history.isEmpty() )
                            return -1 / 0;
                        var entry = it.history.getFirstEntry();
                        if ( entry.maybeData !== null )
                            return -1 / 0;
                        return entEnd( entry );
                    } );
                    if ( bothInactive !== -1 / 0 )
                        addConditionEntry( {
                            maybeData: null,
                            startMillis: startMillis,
                            maybeEndMillis:
                                bothInactive === 1 / 0 ? null :
                                    { val: bothInactive }
                        } );
                    
                    var allNegatory = arrMin( bin.informants,
                        function ( it ) {
                        
                        if ( it.condition === condition )
                            return 1 / 0;
                        if ( it.history.isEmpty() )
                            return -1 / 0;
                        var entry = it.history.getFirstEntry();
                        if ( entry.maybeData !== null )
                            return -1 / 0;
                        return entEnd( entry );
                    } );
                    if ( allNegatory !== -1 / 0 )
                        addConditionEntry( {
                            maybeData: { val: condition },
                            startMillis: startMillis,
                            maybeEndMillis:
                                allNegatory === 1 / 0 ? null :
                                    { val: allNegatory }
                        } );
                } );
            } while ( didSomething );
        }
        
        eachTypeLeafNodeOver(
            type, inWires.left, inWires.right, outWires,
            function (
                type, unused, inWireLeft, inWireRight, outWire ) {
            
            if ( type.op === "atom" ) {
                var informantPair =
                    addInformantPair( type.offsetMillis );
                var leftPending = [];
                var rightPending = [];
                var processMergePending = function () {
                    // TODO: Let this go forward when only one future
                    // is available, as long as that future has
                    // activity.
                    consumeEarliestEntries(
                        [ leftPending, rightPending ],
                        function ( earliestEntries ) {
                        
                        var leftEntry = earliestEntries[ 0 ];
                        var rightEntry = earliestEntries[ 1 ];
                        
                        // NOTE: This is a sanity check to make sure
                        // the inputs are as disjoint as the type
                        // system indicates they are.
                        if ( leftEntry.maybeData !== null &&
                            rightEntry.maybeData !== null )
                            throw new Error();
                        
                        function makeEntry( maybeData ) {
                            return {
                                maybeData: maybeData,
                                startMillis: leftEntry.startMillis,
                                maybeEndMillis:
                                    leftEntry.maybeEndMillis
                            };
                        }
                        
                        outWire.sig.history.addEntry( makeEntry(
                            leftEntry.maybeData !== null ?
                                leftEntry.maybeData :
                                rightEntry.maybeData
                        ) );
                        if ( !!informantPair ) {
                            var conds = leftEntry.maybeData !== null ?
                                { yes: "left", no: "right" } :
                                { yes: "right", no: "left" };
                            informantPair[ conds.yes ].addEntry(
                                makeEntry( { val: [] } ) );
                            informantPair[ conds.no ].addEntry(
                                makeEntry( null ) );
                        }
                    } );
                    if ( !!informantPair )
                        processInformantsPending( type.offsetMillis );
                };
                inWireLeft.stub();
                inWireRight.stub();
                outWire.stub();
                context.onSigsReady( function () {
                    // TODO: See if this code is prepared for the fact
                    // that readEachEntry may yield entries that
                    // overlap with each other.
                    inWireLeft.sig.readEachEntry( function ( entry ) {
                        leftPending.push( entry );
                        processMergePending();
                    } );
                    inWireRight.sig.readEachEntry(
                        function ( entry ) {
                        
                        rightPending.push( entry );
                        processMergePending();
                    } );
                } );
            } else if ( type.op === "anytimeFn" ) {
                outWire.addConnectionDependency( inWireLeft );
                outWire.addConnectionDependency( inWireRight );
                outWire.onStaticInvoke( function (
                    context, delayMillis, inWires, outWires ) {
                    
                    var inWireLeftPairs =
                        makePairsForType( context, type.demand );
                    var inWireRightPairs =
                        makePairsForType( context, type.demand );
                    var outWireLeftPairs =
                        makePairsForType( context, type.response );
                    var outWireRightPairs =
                        makePairsForType( context, type.response );
                    
                    // Split the inputs.
                    var aWires = activityWiresType;
                    behSeqs(
                        behDisjoin( type.demand, aWires, aWires ),
                        behEither( behFst( type.demand, aWires ),
                            behFst( type.demand, aWires ) )
                    ).install( context,
                        typeTimes( inWires, dupActivityWires() ),
                        typePlus(
                            inWireLeftPairs.writable,
                            inWireRightPairs.writable )
                    );
                    
                    inWireLeft.doStaticInvoke( context, delayMillis,
                        inWireLeftPairs.readable,
                        outWireLeftPairs.writable );
                    inWireRight.doStaticInvoke( context, delayMillis,
                        inWireRightPairs.readable,
                        outWireRightPairs.writable );
                    
                    // Merge the outputs.
                    behMerge( type.response ).install( context,
                        typePlus(
                            outWireLeftPairs.readable,
                            outWireRightPairs.readable ),
                        outWires );
                } );
            } else {
                throw new Error();
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
    result.install = function ( context, inWires, outWires ) {
        
        ignoreOutWires( outWires );
        function ignoreOutWires( outWires ) {
            eachTypeLeafNodeOver( outWires,
                function ( type, outWire ) {
                
                if ( type.op === "atom" ) {
                    context.onSigsReady( function () {
                        outWire.sig.history.finishData(
                            context.startMillis );
                    } );
                } else if ( type.op === "anytimeFn" ) {
                    outWire.onStaticInvoke( function (
                        context, delayMillis, inWires, outWires ) {
                        
                        ignoreOutWires( outWires );
                        eachTypeLeafNodeOver( inWires,
                            function ( type, inWire ) {
                            
                            if ( type.op === "atom" ) {
                                inWire.readEachEntry(
                                    function ( entry ) {
                                    
                                    // Do nothing.
                                    
                                    // TODO: See if we should signal a
                                    // violaton of duration coupling.
//                                    throw new Error();
                                } );
                            } else if ( type.op === "anytimeFn" ) {
                                // Do nothing.
                            } else {
                                throw new Error();
                            }
                        } );
                    } );
                } else {
                    throw new Error();
                }
            } );
        }
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

function censorEntry( entry ) {
    return {
        maybeData: entry.maybeData === null ? null : { val: [] },
        startMillis: entry.startMillis,
        maybeEndMillis: entry.maybeEndMillis
    };
}

// NOTE: Unlike Sirea's disjoin, this version has a type which is a
// somewhat complicated refinement of the ideal type signature:
//
// (x * (y + z)) ~> ((x * y) + (x * z))
//
// The refinement would state that every spacetime coordinate
// appearing in the x type must appear identically, at least once, in
// the (y + z) type. The operation will perform no implicit
// synchronization or communication.
//
// We don't actually implement multiple partitions yet, so for now we
// only deal with the time coordinate. The space coordinate is the
// same for all atomic signals.
//
function behDisjoin( branchType, leftType, rightType ) {
    if ( !typesSupplyActivityEvidence(
        [ leftType, rightType ], branchType ) )
        throw new Error();
    var result = {};
    result.inType =
        typeTimes( branchType, typePlus( leftType, rightType ) );
    result.outType = typePlus(
        typeTimes( branchType, leftType ),
        typeTimes( branchType, rightType ) );
    result.install = function ( context, inWires, outWires ) {
        var bins = [];
        function getBin( offsetMillis ) {
            return _.arrAny( bins, function ( bin ) {
                return bin.offsetMillis === offsetMillis && bin;
            } );
        }
        eachTypeLeafNodeOver(
            inWires.first, outWires.left.first, outWires.right.first,
            function ( type, inWire, outWireLeft, outWireRight ) {
            
            if ( type.op === "atom" ) {
                var bin = getBin( type.offsetMillis );
                if ( !bin ) {
                    bin = {
                        offsetMillis: type.offsetMillis,
                        informants: [],
                        branchesPending: []
                    };
                    bins.push( bin );
                }
                context.onSigsReady( function () {
                    var pending = [];
                    bin.branchesPending.push( {
                        outSigLeft: outWireLeft.sig,
                        outSigRight: outWireRight.sig,
                        conditionPending:
                            new ActivityHistory().init( {
                                startMillis: context.startMillis
                            } ),
                        finalCondition: null,
                        dataPending: pending
                    } );
                    // TODO: See if this code is prepared for the fact
                    // that readEachEntry may yield entries that
                    // overlap with each other.
                    inWire.sig.readEachEntry( function ( entry ) {
                        pending.push( entry );
                        processPending();
                    } );
                } );
            } else if ( type.op === "anytimeFn" ) {
                outWireLeft.readFrom( inWire );
                outWireRight.readFrom( inWire );
            } else {
                throw new Error();
            }
        } );
        
        function eachOnOneSide(
            condition, oppositeCondition, type, inWires, outWires ) {
            
            eachTypeLeafNodeOver( inWires, outWires,
                function ( type, inWire, outWire ) {
                
                if ( type.op === "atom" ) {
                    var bin = getBin( type.offsetMillis );
                    var informantHistory =
                        new ActivityHistory().init( {
                            startMillis: context.startMillis
                        } );
                    if ( !!bin )
                        bin.informants.push( {
                            condition: condition,
                            history: informantHistory
                        } );
                    context.onSigsReady( function () {
                        // TODO: See if this code is prepared for the
                        // fact that readEachEntry may yield entries
                        // that overlap with each other.
                        inWire.sig.readEachEntry( function ( entry ) {
                            outWire.sig.history.addEntry( entry );
                            if ( !!bin ) {
                                informantHistory.addEntry(
                                    censorEntry( entry ) );
                                processPending();
                            }
                        } );
                    } );
                } else if ( type.op === "anytimeFn" ) {
                    outWire.readFrom( inWire );
                } else {
                    throw new Error();
                }
            } );
        }
        eachOnOneSide( "left", "notLeft", leftType,
            inWires.second.left, outWires.left.second );
        eachOnOneSide( "right", "notRight", rightType,
            inWires.second.right, outWires.right.second );
        
        function processPending() {
            _.arrEach( bins, function ( bin ) {
                do {
                    var didSomething = false;
                    
                    var addConditionEntry =
                        function ( conditionEntry ) {
                        
                        var endMillis = entEnd( conditionEntry );
                        _.arrEach( bin.informants,
                            function ( informant ) {
                            
                            informant.history.forgetBeforeMillis(
                                endMillis );
                        } );
                        _.arrEach( bin.branchesPending,
                            function ( branch ) {
                            
                            // TODO: See if we should also check if
                            // the entry would be too early to make a
                            // difference to this history.
                            if ( branch.finalCondition !== null )
                                return;
                            didSomething = true;
                            branch.conditionPending.addEntry(
                                conditionEntry );
                        } );
                    };
                    var addFinalConditionEntry =
                        function ( condition, startMillis ) {
                        
                        _.arrEach( bin.informants,
                            function ( informant ) {
                            
                            informant.history.forgetBeforeMillis(
                                1 / 0 );
                        } );
                        _.arrEach( bin.branchesPending,
                            function ( branch ) {
                            
                            var prevEndMillis = entEnd(
                                branch.conditionPending.
                                    getLastEntry() );
                            if ( prevEndMillis === 1 / 0 )
                                return;
                            didSomething = true;
                            branch.conditionPending.addEntry( {
                                maybeData: null,
                                startMillis: startMillis,
                                maybeEndMillis: null
                            } );
                            branch.finalCondition = condition;
                        } );
                    };
                    
                    _.arrEach( [ "left", "right" ],
                        function ( condition ) {
                        
                        var startMillis = bin.informants[ 0
                            ].history.getFirstEntry().startMillis;
                        
                        var anyAffirmative = arrMax( bin.informants,
                            function ( it ) {
                            
                            if ( it.condition !== condition )
                                return -1 / 0;
                            if ( it.history.isEmpty() )
                                return -1 / 0;
                            var entry = it.history.getFirstEntry();
                            if ( entry.maybeData === null )
                                return -1 / 0;
                            return entEnd( entry );
                        } );
                        if ( anyAffirmative !== -1 / 0 )
                            addConditionEntry( {
                                maybeData: { val: condition },
                                startMillis: startMillis,
                                maybeEndMillis:
                                    { val: anyAffirmative }
                            } );
                        
                        var bothInactive = arrMin( bin.informants,
                            function ( it ) {
                            
                            if ( it.history.isEmpty() )
                                return -1 / 0;
                            var entry = it.history.getFirstEntry();
                            if ( entry.maybeData !== null )
                                return -1 / 0;
                            return entEnd( entry );
                        } );
                        if ( bothInactive === 1 / 0 )
                            addFinalConditionEntry(
                                "bothInactive", startMillis );
                        else if ( bothInactive !== -1 / 0 )
                            addConditionEntry( {
                                maybeData: { val: "bothInactive" },
                                startMillis: startMillis,
                                maybeEndMillis: { val: bothInactive }
                            } );
                        
                        var allNegatory = arrMin( bin.informants,
                            function ( it ) {
                            
                            if ( it.condition === condition )
                                return 1 / 0;
                            if ( it.history.isEmpty() )
                                return -1 / 0;
                            var entry = it.history.getFirstEntry();
                            if ( entry.maybeData !== null )
                                return -1 / 0;
                            return entEnd( entry );
                        } );
                        if ( allNegatory === 1 / 0 )
                            addFinalConditionEntry(
                                condition, startMillis );
                        else if ( allNegatory !== -1 / 0 )
                            addConditionEntry( {
                                maybeData: { val: condition },
                                startMillis: startMillis,
                                maybeEndMillis: { val: allNegatory }
                            } );
                    } );
                } while ( didSomething );
                
                _.arrEach( bin.branchesPending, function ( branch ) {
                    
                    // TODO: See if we should really copy the Array
                    // here, since getAllEntries() already does it.
                    var conditionPending = branch.conditionPending.
                        getAllEntries().slice();
                    var consumedEndMillis =
                        conditionPending[ 0 ].startMillis;
                    
                    consumeEarliestEntries( [
                        conditionPending,
                        branch.dataPending
                    ], function ( earliestEntries ) {
                        var conditionEntry = earliestEntries[ 0 ];
                        var dataEntry = earliestEntries[ 1 ];
                        
                        consumedEndMillis = entEnd( dataEntry );
                        
                        var nullEntry = {
                            maybeData: null,
                            startMillis: dataEntry.startMillis,
                            maybeEndMillis: dataEntry.maybeEndMillis
                        };
                        
                        var condition =
                            conditionEntry.maybeData === null ?
                                branch.finalCondition :
                                conditionEntry.maybeData.val;
                        
                        if ( dataEntry.maybeData === null ) {
                            branch.outSigLeft.history.addEntry(
                                nullEntry );
                            branch.outSigRight.history.addEntry(
                                nullEntry );
                        } else if ( condition === "left" ) {
                            branch.outSigLeft.history.addEntry(
                                dataEntry );
                            branch.outSigRight.history.addEntry(
                                nullEntry );
                        } else if ( condition === "right" ) {
                            branch.outSigLeft.history.addEntry(
                                nullEntry );
                            branch.outSigRight.history.addEntry(
                                dataEntry );
                        } else {
                            throw new Error();
                        }
                    } );
                    branch.conditionPending.forgetBeforeMillis(
                        consumedEndMillis );
                } );
            } );
        }
    };
    return result;
}


// ===== Other behavior operations ===================================

function delayAddEntry( outSig, delayMillis, entry ) {
    outSig.history.addEntry( {
        maybeData: entry.maybeData,
        startMillis: entry.startMillis + delayMillis,
        maybeEndMillis: entry.maybeEndMillis === null ? null :
            { val: entry.maybeEndMillis.val + delayMillis }
    } );
}

// NOTE: There's an extra requirement in the type signature of
// behClosure, much like behDisjoin and behMerge: The closure's
// parameter signal must be active in enough (partition, time offset)
// coordinates to act as a filter for the encapsulated signal.
//
// If the behavior is called conditionally (thanks to having been
// split through behDisjoin), we will still install it once for each
// call site, but those conditional call sites should only be
// receiving appropriately masked versions of the encapsulated signal,
// as though that signal were split between the behDisjoin branches
// itself. Unfortunately, we can't split that signal at the
// behDisjoin, because behDisjoin doesn't require enough evidence to
// do that splitting. So instead, we fully duplicate the signal at run
// time but then mask it using the parameter signal itself.
//
// (TODO: If we ever want behDisjoin to do the splitting, it'll need
// to pay attention to the parameters of the typeAnytimeFn() signals
// its splitting, much like behMerge already does. We'll still need to
// keep this proviso on behClosure, because then the parameter type is
// a valid way for behDisjoin to predict whether it has enough
// information to filter the signal.)
//
// TODO: See what this would be called in Sirea, if anything.
//
function behClosure( beh ) {
    var inputPairType = beh.inType;
    if ( beh.inType.op !== "times" )
        throw new Error();
    var encapsulatedType = beh.inType.first;
    var paramType = beh.inType.second;
    
    if ( !typesSupplyActivityEvidence(
        [ paramType ], encapsulatedType ) )
        throw new Error();
    
    var result = {};
    result.inType = encapsulatedType;
    result.outType = typeAnytimeFn( paramType, beh.outType, null );
    result.install = function (
        context, inWiresEncapsulated, outWiresFunc ) {
        
        var outWireFunc = outWiresFunc.leafInfo;
        
        var invocations = [];
        
        eachTypeLeafNodeZipper( inWiresEncapsulated, _.idfn,
            function ( get ) {
            
            var type = get( inWiresEncapsulated );
            var inWire = type.leafInfo;
            
            if ( type.op === "atom" ) {
                context.onSigsReady( function () {
                    inWire.readEachEntry( function ( entry ) {
                        _.arrEach( invocations,
                            function ( invocation ) {
                            
                            var responseWire =
                                get( invocation.writables ).leafInfo;
                            delayAddEntry( responseWire.sig,
                                invocation.delayMillis, entry );
                        } );
                    } );
                } );
            } else if ( type.op === "anytimeFn" ) {
                // Do nothing.
                
                // NOTE: We already use addOnlyConnectionDependency
                // and onStaticInvoke elsewhere.
                
            } else {
                throw new Error();
            }
        } );
        
        outWireFunc.onStaticInvoke( function (
            context, delayMillis, inWiresParam, outWiresResult ) {
            
            var delayedEncapsulatedPairs =
                makePairsForType( context, encapsulatedType );
            
            eachTypeLeafNodeOver(
                inWiresEncapsulated,
                delayedEncapsulatedPairs.writables,
                function ( type, inWire, outWire ) {
                
                if ( type.op === "atom" ) {
                    // Do nothing.
                    
                    // NOTE: We already use readEachEntry and
                    // delayAddEntry elsewhere.
                    
                } else if ( type.op === "anytimeFn" ) {
                    outWire.addOnlyConnectionDependency( inWire );
                    outWire.onStaticInvoke( function (
                        context, totalDelayMillis, inWires, outWires
                        ) {
                        
                        inWire.doStaticInvoke(
                            context, totalDelayMillis + delayMillis,
                            inWires, outWires );
                    } );
                } else {
                    throw new Error();
                }
            } );
            
            invocations.push( {
                delayMillis: delayMillis,
                writables: delayedEncapsulatedPairs.writables
            } );
            
            // NOTE: In order to mask the encapsulated signal based on
            // the parameter signal, we're using behDisjoin.
            //
            // NOTE: Thanks to the typePlus( _, typeOne() ) pattern
            // we're using here, we're committing no crimes against
            // duration coupling.
            //
            behSeqs(
                behDisjoin( encapsulatedType, paramType, typeOne() ),
                behEither(
                    beh,
                    behDrop(
                        typeTimes( encapsulatedType, typeOne() ) )
                )
            ).install( context,
                typeTimes( delayedEncapsulatedPairs.readables,
                    typePlus( inWiresParam, typeOne() ) ),
                typePlus( outWiresResult, typeOne() ) );
        } );
    };
    return result;
}

// TODO: See what this would be called in Sirea, if anything.
function behCall( funcType ) {
    if ( funcType.op !== "anytimeFn" )
        throw new Error();
    var result = {};
    result.inType = typeTimes( funcType, funcType.demand );
    result.outType = funcType.response;
    result.install = function ( context, inWires, outWires ) {
        var inWireFunc = inWires.first.leafInfo;
        var inWireParam = inWires.second;
        context.onBegin( function () {
            // TODO: See if we end up entering an infinite loop with
            // this.
            if ( !inWireFunc.isConnected() )
                return !"wasAbleToFinish";
            
            var delayMillis = 0;
            var innerContext =
                makeSubcontext( context, context.startMillis );
            inWireFunc.doStaticInvoke( innerContext.context,
                delayMillis, inWireParam, outWires );
            innerContext.begin();
            
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
    result.outType = typePlusOffsetMillis( delayMillis, type );
    result.install = function ( context, inWires, outWires ) {
        eachTypeLeafNodeOver( inWires, outWires,
            function ( type, inWire, outWire ) {
            
            if ( type.op === "atom" ) {
                context.onSigsReady( function () {
                    inWire.sig.readEachEntry( function ( entry ) {
                        delayAddEntry(
                            outWire.sig, delayMillis, entry );
                    } );
                } );
            } else if ( type.op === "anytimeFn" ) {
                outWire.addOnlyConnectionDependency( inWire );
                outWire.onStaticInvoke( function (
                    context, totalDelayMillis, inWires, outWires ) {
                    
                    inWire.doStaticInvoke(
                        context, totalDelayMillis + delayMillis,
                        inWires, outWires );
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
    result.install = function ( context, inWires, outWires ) {
        var inWire = inWires.leafInfo;
        var outWire = outWires.leafInfo;
        context.onSigsReady( function () {
            inWire.sig.readEachEntry( function ( entry ) {
                outWire.sig.history.addEntry( {
                    maybeData: entry.maybeData === null ? null :
                        { val: func( entry.maybeData.val ) },
                    startMillis: entry.startMillis,
                    maybeEndMillis: entry.maybeEndMillis
                } );
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
    result.install = function ( context, inWires, outWires ) {
        var inWire = inWires.leafInfo;
        var outWireLeft = outWires.left.leafInfo;
        var outWireRight = outWires.right.leafInfo;
        context.onSigsReady( function () {
            inWire.sig.readEachEntry( function ( entry ) {
                var direction = null;
                if ( entry.maybeData !== null
                    && _.likeArray( entry.maybeData.val )
                    && entry.maybeData.val.length === 2 )
                    direction = entry.maybeData.val[ 0 ];
                if ( !(direction === null
                    || direction === "<"
                    || direction === ">") )
                    throw new Error();
                outWireLeft.sig.history.addEntry( {
                    maybeData: direction === "<" ?
                        { val: entry.maybeData.val[ 1 ] } : null,
                    startMillis: entry.startMillis,
                    maybeEndMillis: entry.maybeEndMillis
                } );
                outWireRight.sig.history.addEntry( {
                    maybeData: direction === ">" ?
                        { val: entry.maybeData.val[ 1 ] } : null,
                    startMillis: entry.startMillis,
                    maybeEndMillis: entry.maybeEndMillis
                } );
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
    result.install = function ( context, inWires, outWires ) {
        var inWireFirst = inWires.first.leafInfo;
        var inWireSecond = inWires.second.leafInfo;
        var outWire = outWires.leafInfo;
        
        var sentMillis = -1 / 0;
        
        context.onSigsReady( function () {
            inWireFirst.sig.syncOnAdd( function () {
                sendOut();
            } );
            inWireSecond.sig.syncOnAdd( function () {
                sendOut();
            } );
        } );
        
        function sendOut() {
            // TODO: See if this should use consumeEarliestEntries.
            // For that matter, see if consumeEarliestEntries should
            // use this!
            var entriesFirst =
                inWireFirst.sig.history.getAllEntries();
            var entriesSecond =
                inWireSecond.sig.history.getAllEntries();
            var endFirstMillis = entsEnd( entriesFirst );
            var endSecondMillis = entsEnd( entriesSecond );
            var endToSendMillis =
                Math.min( endFirstMillis, endSecondMillis );
            if ( endToSendMillis <= sentMillis )
                return;
            eachZipEnts( 0, entriesFirst, entriesSecond,
                function ( maybeFirstData, maybeSecondData,
                    startMillis, endMillis ) {
                
                // NOTE: At this point, if we see inactivity on either
                // of the signals, it may actually be activity that
                // was forgotten via forgetBeforeMillis. To address
                // this, we skip any parts of this loop that occur
                // before sentMillis.
                if ( endMillis <= sentMillis )
                    return;
                
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
                
                outWire.sig.history.addEntry( {
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
            inWireFirst.sig.history.forgetBeforeMillis(
                endToSendMillis );
            inWireSecond.sig.history.forgetBeforeMillis(
                endToSendMillis );
            sentMillis = endToSendMillis;
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
    result.install = function ( context, inWires, outWires ) {
        var inWire = inWires.leafInfo;
        var outWire = outWires.leafInfo;
        
        var demander = context.membrane.getNewOutDemander(
            context.startMillis, delayMillis,
            function () {  // syncOnResponseAvailable
                _.arrEach( getAndForgetDemanderResponse( demander ),
                    function ( entry ) {
                    
                    outWire.sig.history.addEntry( {
                        maybeData: entry.maybeData === null ? null :
                            { val: entry.maybeData.val.length === 1 ?
                                [] : entry.maybeData.val[ 1 ] },
                        startMillis: entry.startMillis,
                        maybeEndMillis: entry.maybeEndMillis
                    } );
                } );
            } );
        
        context.onSigsReady( function () {
            inWire.sig.readEachEntry( function ( entry ) {
                if ( entry.maybeEndMillis === null )
                    demander.finishDemand( entry.startMillis );
                else if ( entry.maybeData === null )
                    demander.suspendDemand(
                        entry.startMillis, entry.maybeEndMillis.val );
                else
                    demander.setDemand( entry.maybeData.val,
                        entry.startMillis, entry.maybeEndMillis.val );
            } );
        } );
    };
    return result;
}

// TODO: See if we're ever going to use this. The point of writing it
// was to warm up for writing non-inlined first-class behaviors (which
// would come in handy for modeling beval and/or a delaying fixpoint
// operator). As such, this is an experiment that maintains a dynamic
// pool of installed behavior graphs. We should feel free to scrap
// this for parts (i.e. cut and paste) once we have a real purpose for
// it.
function connectMembraneToBehaviors( pairHalf, context, delayToBeh ) {
    
    var pool = makeOffsetMillisMap();
    var demandPermanentUntilMillis = -1 / 0;
    
    function getOrMakePoolEntry( delayMillis, startMillis ) {
        if ( startMillis < context.startMillis )
            throw new Error();
        if ( !pool.has( delayMillis ) )
            pool.set( delayMillis, [] );
        var bin = pool.get( delayMillis );
        var poolEntry = _.arrAny( bin, function ( entry ) {
            return entry.nextStartMillis <= startMillis && entry;
        } );
        if ( poolEntry )
            return poolEntry;
        var demandPair = makeLinkedWirePair( context, startMillis );
        var demandAndResponsePair =
            makeLinkedWirePair( context, startMillis + delayMillis );
        var beh = delayToBeh( delayMillis );
        if ( !(true
            && !!typesUnify( typeAtom( 0, null ), beh.inType )
            && typesAreEqual( delayMillis, beh.inType, beh.outType )
        ) )
            throw new Error();
        var innerContext =
            makeSubcontext( context, startMillis );
        behSeqs(
            behDupPar(
                behDelay( delayMillis, typeAtom( 0, null ) ),
                beh
            ),
            behZip()
        ).install( innerContext.context,
            typeAtom( 0, demandPair.readable ),
            typeAtom( delayMillis, demandAndResponsePair.writable ) );
        innerContext.begin();
        poolEntry = {
            nextStartMillis: startMillis,
            responseAlreadyGivenMillis: startMillis + delayMillis,
            demandSig: demandPair.writable.sig
        };
        demandAndResponsePair.readable.sig.readEachEntry(
            function ( entry ) {
            
            if ( entry.maybeData === null )
                return;
            
            poolEntry.responseAlreadyGivenMillis =
                entry.maybeEndMillis.val;
            pairHalf.membrane.setOutResponse(
                delayMillis,
                entry.maybeData.val[ 0 ],
                entry.maybeData.val[ 1 ],
                entry.startMillis,
                entry.maybeEndMillis.val );
            // TODO: For efficiency, see if we can avoid calling
            // raiseOtherOutPermanentUntilMillis() so often, since it
            // loops through the whole pool.
            raiseOtherOutPermanentUntilMillis();
        } );
        bin.push( poolEntry );
        return poolEntry;
    }
    
    function raiseOtherOutPermanentUntilMillis() {
        var otherOutPermanentUntilMillis = demandPermanentUntilMillis;
        pool.each( function ( delayMillis, bin ) {
            _.arrEach( bin, function ( poolEntry ) {
                if ( poolEntry.responseAlreadyGivenMillis <
                    otherOutPermanentUntilMillis )
                    otherOutPermanentUntilMillis =
                        poolEntry.responseAlreadyGivenMillis;
            } );
        } );
        if ( otherOutPermanentUntilMillis !== -1 / 0 )
            pairHalf.membrane.raiseOtherOutPermanentUntilMillis(
                otherOutPermanentUntilMillis );
    }
    
    function retractPoolBeforeNextStartMillis( nextStartMillis ) {
        var newPool = makeOffsetMillisMap();
        pool.each( function ( delayMillis, bin ) {
            var newBin = _.arrKeep( bin, function ( poolEntry ) {
                return poolEntry.nextStartMillis < nextStartMillis;
            } );
            if ( newBin.length !== 0 )
                newPool.set( delayMillis, newBin );
        } );
        pool = newPool;
    }
    
    pairHalf.syncOnInDemandAvailable( function () {
        demandPermanentUntilMillis =
            pairHalf.membrane.getInPermanentUntilMillis();
        _.arrEach( pairHalf.membrane.getInDemandHistoryEntries(),
            function ( demand ) {
            
            var delayMillis = demand.delayMillis;
            _.arrEach( demand.demandDataHistory, function ( entry ) {
                if ( entry.maybeData === null )
                    return;
                // TODO: For efficiency, see if we can avoid calling
                // getOrMakePoolEntry() so often, since it loops
                // through the whole pool.
                var poolEntry = getOrMakePoolEntry(
                    delayMillis, entry.startMillis );
                poolEntry.demandSig.history.setData(
                    entry.maybeData.val,
                    entry.startMillis,
                    entry.maybeEndMillis.val );
                poolEntry.nextStartMillis = entry.maybeEndMillis.val;
            } );
        } );
        pairHalf.membrane.forgetInDemandBeforeDemandMillis(
            demandPermanentUntilMillis );
        
        // Clean up any pool entries we don't need.
        //
        // TODO: See if this is really the best time to do this.
        //
        // TODO: For efficiency, see if we're calling
        // retractPoolBeforeNextStartMillis() infrequently enough,
        // since it loops through the whole pool. This might be good
        // enough.
        //
        // TODO: We're using a heuristic here. We release any pool
        // entry which has been so neglected recently that it will
        // definitely be ready for any upcoming demand. See if we
        // should add a grace period to this (by subtracting a
        // constant from the parameter), add a lower bound on the
        // number of pool entries, and/or use some kind of
        // probabilistic decay technique.
        //
        retractPoolBeforeNextStartMillis(
            demandPermanentUntilMillis );
    } );
}

// TODO: See if we should keep this utilities around, and if so,
// where.
var debugLogForFrequencyLog = [];
function debugLogForFrequencyGetLength() {
    var then = new Date().getTime() - 1000;
    while ( debugLogForFrequencyLog.length !== 0
        && debugLogForFrequencyLog[ 0 ] < then )
        debugLogForFrequencyLog.shift();
    return debugLogForFrequencyLog.length;
}
function debugLogForFrequency() {
    var now = new Date().getTime();
    debugLogForFrequencyLog.push( now );
    var then = now - 1000;
    while ( debugLogForFrequencyLog.length !== 0
        && debugLogForFrequencyLog[ 0 ] < then )
        debugLogForFrequencyLog.shift();
}

// NOTE: We use a defer procedure as a parameter here, so that
// feedback loops don't grind the entire page to a halt. However,
// those loops will still execute forever, so be careful.
//
// TODO: Implement resource spaces so that we can provide dynamic
// acquisition of demand monitors while permitting external
// observation and extensibility.
//
// TODO: This currently returns a demander behavior and a monitor
// behavior. Return a resource control behavior of some sort as well.
//
function behDemandMonitor( defer ) {
    
    var installedDemanders = [];
    var createdDemandersPending = false;
    var installedMonitors = [];
    
    function createDemandersPending() {
        if ( createdDemandersPending )
            return;
        createdDemandersPending = true;
        _.arrEach( installedMonitors, function ( monitor ) {
            monitor.demandersPending = _.arrMap( installedDemanders,
                function ( demander ) {
                
                return new ActivityHistory().init( {
                    startMillis: demander.startMillis
                } );
            } );
        } );
    }
    
    var demander = {};
    demander.inType = typeAtom( 0, null );
    demander.outType = typeOne();
    demander.install = function ( context, inWires, outWires ) {
        var inWire = inWires.leafInfo;
        
        var i = installedDemanders.length;
        
        installedDemanders.push(
            { startMillis: context.startMillis } );
        context.onSigsReady( function () {
            inWire.sig.readEachEntry( function ( entry ) {
                createDemandersPending();
                _.arrEach( installedMonitors, function ( monitor ) {
                    monitor.demandersPending[ i ].addEntry( entry );
                    defer( function () {
                        monitor.processPending();
                    } );
                } );
            } );
        } );
    };
    
    var monitor = {};
    monitor.inType = typeAtom( 0, null );
    monitor.outType = typeAtom( 0, null );
    monitor.install = function ( context, inWires, outWires ) {
        var inWire = inWires.leafInfo;
        var outWire = outWires.leafInfo;
        
        var demanderPending = new ActivityHistory().init( {
            startMillis: context.startMillis
        } );
        var monitorPending = new ActivityHistory().init( {
            startMillis: context.startMillis
        } );
        function processPending() {
            
            // TODO: See if we should really copy the Arrays here,
            // since getAllEntries() already does it.
            
            var monitorEntries =
                monitorPending.getAllEntries().slice();
            var consumedEndMillis = monitorEntries[ 0 ].startMillis;
            
            // TODO: This part of the code sure is called a lot. It
            // probably has to do with the fact that every demand
            // update triggers this processPending(). We should
            // eventually see how much redundancy we can eliminate
            // by doing a topological sort or by using David's
            // touch-then-propagate technique
            // (http://lambda-the-ultimate.org/node/4453). Until then,
            // there's still plenty of room for naive optimization
            // here. (For instance, the next thing we can do is to
            // exit fast if the monitor's latest active time is
            // greater than the output history's latest time.)
            
            var outSigHistoryEndMillis =
                entEnd( outWire.sig.history.getLastEntry() );
            // TODO: See if we should take out this debug code.
//            if ( consumedEndMillis - outSigHistoryEndMillis <= 10 )
//                debugLogForFrequency();
//            sometimesLog( debugLogForFrequencyGetLength() );
            consumeEarliestEntriesCapped(
                outSigHistoryEndMillis,
                [ monitorEntries ].concat( _.arrMap(
                    monitorInfo.demandersPending,
                    function ( demanderPending ) {
                    
                    return demanderPending.getAllEntries().slice();
                } ) ),
                function ( earliestEntries ) {
                
                var monitorEntry = earliestEntries[ 0 ];
                var demandEntries = _.arrCut( earliestEntries, 1 );
                
                consumedEndMillis = entEnd( monitorEntry );
                
                var maybeData = null;
                if ( monitorEntry.maybeData !== null ) {
                    // NOTE: We deduplicate the demands by putting
                    // them into a set along the way.
                    var set = new Map().init( {
                        keyHash: function ( inputData ) {
                            return dataHash( inputData );
                        },
                        keyIsoAssumingHashIso: function ( a, b ) {
                            return dataIsoAssumingHashIso( a, b );
                        }
                    } );
                    maybeData = { val: _.acc( function ( y ) {
                        _.arrEach( demandEntries, function ( entry ) {
                            if ( entry.maybeData === null )
                                return;
                            var data = entry.maybeData.val;
                            if ( set.has( data ) )
                                return;
                            set.set( data, true );
                            y( data );
                        } );
                    } ) };
                }
                
                outWire.sig.history.addEntry( {
                    maybeData: maybeData,
                    startMillis: monitorEntry.startMillis,
                    maybeEndMillis: monitorEntry.maybeEndMillis
                } );
            } );
            
            monitorPending.forgetBeforeMillis( consumedEndMillis );
            
            if ( !monitorPending.isEmpty() ) {
                var nextMonitorEntry =
                    monitorPending.getAllEntries()[ 0 ];
                if ( nextMonitorEntry.maybeData === null ) {
                    outWire.sig.history.addEntry( nextMonitorEntry );
                    consumedEndMillis = entEnd( nextMonitorEntry );
                    monitorPending.forgetBeforeMillis(
                        consumedEndMillis );
                }
            }
            
            _.arrEach( monitorInfo.demandersPending,
                function ( pending ) {
                
                pending.forgetBeforeMillis( consumedEndMillis );
            } );
        }
        var monitorInfo = {
            demandersPending: null,
            processPending: processPending
        };
        context.onSigsReady( function () {
            installedMonitors.push( monitorInfo );
            inWire.sig.readEachEntry( function ( entry ) {
                monitorPending.addEntry( entry );
                defer( function () {
                    createDemandersPending();
                    processPending();
                } );
            } );
        } );
    };
    
    return { demander: demander, monitor: monitor };
}

// NOTE: We use a defer procedure as a parameter here, so that
// feedback loops don't grind the entire page to a halt. However,
// those loops will still execute forever, so be careful.
//
// NOTE: This only supports JavaScript numbers as states. When
// multiple rules apply at once, we choose the rule which leads to the
// lowest state. If that still doesn't narrow it down, we choose the
// rule with the lowest cooldown. If we need to choose a rule at the
// same instant the ruleset is updating, we use the older ruleset.
//
// TODO: Implement resource spaces so that we can provide dynamic
// acquisition of animated state resources while permitting external
// observation and extensibility.
//
// TODO: This currently returns a demander behavior and a monitor
// behavior. Return a resource control behavior of some sort as well.
//
function behAnimatedState(
    defer, initialState, compareStates, transitions ) {
    
    var deMonIn = behDemandMonitor( defer );
    var deMonOut = behDemandMonitor( defer );
    
    var currentVal = initialState;
    var updaterHistoryEndMillis = -1 / 0;
    var currentCooldownMillis = 0;
    function advanceUpdaterHistoryEndMillis( newMillis ) {
        newMillis = Math.max( newMillis, updaterHistoryEndMillis );
        currentCooldownMillis -=
            newMillis - updaterHistoryEndMillis;
        updaterHistoryEndMillis = newMillis;
    }
    
    // TODO: Whoops, this behavior doesn't preserve duration coupling.
    // See if there's another way to do this that does. Fortunately,
    // the duration coupling violation is completely internal to this
    // state resource.
    var updaterInternal = {};
    updaterInternal.inType = typeAtom( 0, null );
    updaterInternal.outType = typeAtom( 0, null );
    updaterInternal.install = function (
        context, inWires, outWires ) {
        
        var inWire = inWires.leafInfo;
        var outWire = outWires.leafInfo;
        
        // TODO: Reindent.
        context.onSigsReady( function () {
        inWire.sig.readEachEntry( function ( entry ) {
            
            if ( entEnd( entry ) < updaterHistoryEndMillis ) {
                outWire.sig.history.addEntry( {
                    maybeData: { val: "" },
                    startMillis: entry.startMillis,
                    maybeEndMillis: entry.maybeEndMillis
                } );
                return;
            }
            
            if ( updaterHistoryEndMillis === 1 / 0 ) {
                outWire.sig.history.addEntry( {
                    maybeData: null,
                    startMillis: entry.startMillis,
                    maybeEndMillis: null
                } );
                
            } else if (
                entry.startMillis < updaterHistoryEndMillis ) {
                
                outWire.sig.history.addEntry( {
                    maybeData: { val: "" },
                    startMillis: entry.startMillis,
                    maybeEndMillis:
                        { val: updaterHistoryEndMillis }
                } );
                
            } else if (
                updaterHistoryEndMillis < entry.startMillis ) {
                
                // NOTE: This case happens once, at the very
                // beginning of the app. (We do this sanity check to
                // make sure that's actually true.)
                if ( updaterHistoryEndMillis !== -1 / 0 )
                    throw new Error();
                
                updaterHistoryEndMillis = entry.startMillis;
                outWire.sig.history.addEntry( {
                    maybeData: { val: JSON.stringify( currentVal ) },
                    startMillis: outWire.sig.history.getLastEntry().
                        startMillis,
                    maybeEndMillis: { val: updaterHistoryEndMillis }
                } );
            }
            
            var rules = entry.maybeData === null ? [] :
                _.arrMappend( entry.maybeData.val, function ( rule ) {
                    if ( !(true
                        && _.likeArray( rule )
                        && rule.length === 2
                        && _.isString( rule[ 0 ] )
                        && _.hasOwn( transitions, "" + rule[ 0 ] )
                    ) )
                        return [];
                    return transitions[ "" + rule[ 0 ] ].call( {},
                        rule[ 1 ] );
                } );
            while ( updaterHistoryEndMillis < entEnd( entry ) ) {
                var currentRules =
                    _.arrMappend( rules, function ( rule ) {
                        var replacement = rule( currentVal );
                        return replacement === null ? [] :
                            [ replacement ];
                    } );
                
                if ( currentRules.length === 0 ) {
                    // TODO: See if this should reset the state
                    // instead of prolonging the current state. After
                    // all, if this state resource is to be a
                    // discoverable resource, there oughta be some
                    // justification as to why it started at its
                    // initial value. On the other hand, if this is to
                    // be a persistent resource, we'll actually want
                    // it to start in a state other than its
                    // designated initial state sometimes, since this
                    // other state represents the previously persisted
                    // value.
                    outWire.sig.history.addEntry( {
                        maybeData:
                            entry.maybeEndMillis === null ? null :
                                { val: JSON.stringify( currentVal ) },
                        startMillis: entry.startMillis,
                        maybeEndMillis: entry.maybeEndMillis
                    } );
                    
                    // NOTE: We don't let inactivity satisfy the
                    // cooldown. That helps keep this state resource
                    // deterministic even if there are pauses in the
                    // app activity signal.
                    if ( entry.maybeData === null )
                        updaterHistoryEndMillis = entEnd( entry );
                    else
                        advanceUpdaterHistoryEndMillis(
                            entEnd( entry ) );
                    return;
                }
                
                var favoriteRule = 0 < currentCooldownMillis ? {
                    newVal: currentVal,
                    cooldownMillis: currentCooldownMillis
                } : _.arrFoldl(
                    currentRules[ 0 ],
                    _.arrCut( currentRules, 1 ),
                    function ( a, b ) {
                        var comparedStates =
                            compareStates( a.newVal, b.newVal );
                        return comparedStates < 0 ? a :
                            0 < comparedStates ? b :
                            a.cooldownMillis < b.cooldownMillis ? a :
                            b;
                    } );
                
                currentVal = favoriteRule.newVal;
                currentCooldownMillis = favoriteRule.cooldownMillis;
                
                // TODO: If we ever want to support fractional values
                // for cooldownMillis, fix this code. It adds a very
                // large number (updaterHistoryEndMillis) to what
                // could be a very small fraction, and then it
                // subtracts the difference from the cooldown (via
                // advanceUpdaterHistoryEndMillis), rather than just
                // setting the cooldown to zero.
                var nextUpdaterHistoryEndMillis =
                    Math.min( entEnd( entry ),
                        updaterHistoryEndMillis +
                            currentCooldownMillis );
                outWire.sig.history.addEntry( {
                    maybeData: { val: JSON.stringify( currentVal ) },
                    startMillis: updaterHistoryEndMillis,
                    maybeEndMillis:
                        { val: nextUpdaterHistoryEndMillis }
                } );
                advanceUpdaterHistoryEndMillis(
                    nextUpdaterHistoryEndMillis );
            }
        } );
        } );
    };
    
    var updater = behSeqs(
        behFmap( function ( val ) {
            return [];
        } ),
        deMonIn.monitor,
        updaterInternal,
        deMonOut.demander
    );
    
    var result = {};
    result.demander = behSeqs(
        behDupPar( updater, deMonIn.demander ),
        behSnd( typeOne(), typeOne() )
    );
    result.monitor = behSeqs(
        behDupPar( updater, behSeqs(
            deMonOut.monitor,
            behFmap( function ( responses ) {
                var filteredResponses =
                    _.arrKeep( responses, function ( it ) {
                        return it !== "";
                    } );
                if ( filteredResponses.length !== 1 )
                    throw new Error();
                return filteredResponses[ 0 ];
            } )
        ) ),
        behSnd( typeOne(), typeAtom( 0, null ) )
    );
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


// ===== Low-accuracy event integration and ad hoc side effects ======

function behEventfulSource( opts ) {
    opts = _.opt( opts ).or( {
        apologyVal: "",
        listenOnUpdate: function ( listener ) {
            // Do nothing.
        },
        // TODO: Keep tuning these constants based on the interval
        // frequency we actually achieve, rather than the one we shoot
        // for.
        intervalMillis: 100,  // 10,
        stabilityMillis: 500  // 200
    } ).bam();
    if ( !(true
        && isValidData( opts.apologyVal )
        && _.isFunction( opts.listenOnUpdate )
        && isValidDuration( opts.intervalMillis )
        && isValidDuration( opts.stabilityMillis )
    ) )
        throw new Error();
    
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType = typeAtom( 0, null );
    result.install = function ( context, inWires, outWires ) {
        var inWire = inWires.leafInfo;
        var outWire = outWires.leafInfo;
        
        var currentVal = opts.apologyVal;
        opts.listenOnUpdate.call( {}, function ( newVal ) {
            currentVal = newVal;
        } );
        
        // TODO: Reindent.
        context.onSigsReady( function () {
        
        var responsesToGive = [];
        // TODO: See if this code is prepared for the fact that
        // readEachEntry may yield entries that overlap with each
        // other.
        inWire.sig.readEachEntry( function ( entry ) {
            if ( entry.maybeEndMillis.val <= entry.startMillis ) {
                // Don't bother queuing this response-to-give.
                return;
            }
            responsesToGive.push( {
                active: entry.maybeData !== null,
                startMillis: entry.startMillis,
                maybeEndMillis: entry.maybeEndMillis
            } );
            handleInactive();
        } );
        function handleInactive() {
            while ( responsesToGive.length !== 0 ) {
                var rtg = responsesToGive[ 0 ];
                if ( rtg.active )
                    break;
                outWire.sig.history.addEntry( {
                    maybeData: null,
                    startMillis: rtg.startMillis,
                    maybeEndMillis: rtg.maybeEndMillis
                } );
                responsesToGive.shift();
            }
        }
        setInterval( function () {
            var startToSendMillis = new Date().getTime();
            var endToSendMillis =
                startToSendMillis + opts.stabilityMillis;
            
            while ( true ) {
                handleInactive();
                if ( responsesToGive.length === 0 ) {
                    // TODO: We have a measurement, but the program
                    // logic hasn't gotten far enough along to request
                    // it yet. See if we should store this measurement
                    // and use it when the program gets to that point.
                    break;
                }
                
                // If the measured interval is too early for the next
                // requested measurement, we're done responding for
                // now.
                if ( endToSendMillis <
                    responsesToGive[ 0 ].startMillis )
                    break;
                
                var rtg = responsesToGive.shift();
                
                // If the requested measurement is earlier than the
                // measured interval, just apologize.
                if ( rtg.maybeEndMillis.val < startToSendMillis ) {
                    outWire.sig.history.setData( opts.apologyVal,
                        rtg.startMillis, rtg.maybeEndMillis.val );
                    continue;
                }
                
                var thisStartToSendMillis =
                    Math.max( rtg.startMillis, startToSendMillis );
                var thisEndToSendMillis = Math.min(
                    rtg.maybeEndMillis.val, endToSendMillis );
                outWire.sig.history.setData( opts.apologyVal,
                    rtg.startMillis, thisStartToSendMillis );
                outWire.sig.history.setData( currentVal,
                    thisStartToSendMillis, thisEndToSendMillis );
                if ( endToSendMillis < rtg.maybeEndMillis.val ) {
                    responsesToGive.unshift( {
                        active: true,
                        startMillis: endToSendMillis,
                        maybeEndMillis: rtg.maybeEndMillis
                    } );
                    break;
                }
            }
        }, opts.intervalMillis );
        
        } );
    };
    return result;
}

function behEventfulTarget( opts ) {
    opts = _.opt( opts ).or( {
        onUpdate: function ( newVal ) {
            // Do nothing.
        }
    } ).bam();
    if ( !(true
        && _.isFunction( opts.onUpdate )
    ) )
        throw new Error();
    
    var result = {};
    result.inType = typeAtom( 0, null );
    result.outType = typeOne();
    result.install = function ( context, inWires, outWires ) {
        var inWire = inWires.leafInfo;
        
        var sentMillis = -1 / 0;
        
        context.onSigsReady( function () {
            inWire.sig.readEachEntry( function ( entry ) {
                
                // TODO: Give Lathe.js a setTimeout equivalent which
                // does this. The point is that setTimeout has a lower
                // limit on its time interval, so Lathe.js's _.defer()
                // might actually use a more responsive technique when
                // the interval is small, such as postMessage,
                // setImmediate, process.nextTick, or
                // requestAnimationFrame.
                //
                // TODO: See if 10 ms is the right lower bound to use
                // here.
                //
                // TODO: See if we should somehow protect against
                // cases where _.defer( func ) actually fires sooner
                // than we want it to.
                //
                function quickSetTimeout( millis, func ) {
                    if ( millis < 10 )
                        _.defer( func );
                    else
                        setTimeout( func, millis );
                }
                
                quickSetTimeout(
                    entry.startMillis - new Date().getTime(),
                    function () {
                    
                    // In case the quickSetTimeout calls get out of
                    // order, don't send this value.
                    if ( entry.startMillis < sentMillis )
                        return;
                    sentMillis = entry.startMillis;
                    
                    opts.onUpdate.call( {}, entry.maybeData );
                } );
            } );
        } );
    };
    return result;
}

function behEventfulTargetNoDrop( opts ) {
    return behSeqs(
        behDupPar( behId( typeAtom( 0, null ) ), behEventfulTarget( opts ) ),
        behFst( typeAtom( 0, null ), typeOne() )
    );
}

function behMouseQuery( opt_opts ) {
    var opts = _.opt( opt_opts ).or( {
        // TODO: Keep tuning these constants based on the interval
        // frequency we actually achieve, rather than the one we shoot
        // for.
        intervalMillis: 100,  // 10,
        stabilityMillis: 500  // 200
    } ).bam();
    
    return behEventfulSource( {
        apologyVal: JSON.stringify( null ),
        listenOnUpdate: function ( listener ) {
            _.appendDom( window, { mousemove: function ( e ) {
                listener(
                    JSON.stringify( [ e.clientX, e.clientY ] ) );
            } } );
        },
        intervalMillis: opts.intervalMillis,
        stabilityMillis: opts.stabilityMillis
    } );
}

function behDomDiagnostic( syncOnLinkMetadata ) {
    var display = _.dom( "div", JSON.stringify( null ) );
    syncOnLinkMetadata( { dom: display } );
    return behEventfulTargetNoDrop( {
        onUpdate: function ( newMaybeVal ) {
            _.dom( display, JSON.stringify( newMaybeVal ) );
        }
    } );
}
