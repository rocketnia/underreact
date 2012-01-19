// underreact-rdpio.js

// The copyright and license information below applies to this file as
// an independent work. Other files commonly used or bundled with this
// one may have different authors and different posted licenses.

// Copyright (c) 2011, David Barbour
// Copyright (c) 2012, Ross Angle
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


// ===== About RDP ===================================================
//
// Reactive Demand Programming (RDP) is a new model for programming
// intended to act as a simple basis for scalable, secure,
// compositional programming in open distributed systems. That is,
// it's geared for use in a context where multiple mutually
// distrusting participants are voluntarily providing long-running
// services for each other over a network (e.g. the Internet).
//
// It's based on a concept of programs as "behaviors" which map
// continuous input signals (demands) to continuous output signals
// (responses) while performing side effects. The response always has
// exactly the same duration as the demand, but each behavior may
// delay its response by a constant amount to account for computation
// time or physical-world actions like reorienting a camera. When
// there is no demand, there is neither a response nor side effects,
// making this a reactive model.
//
// In fact, the notion of "side effects" may or may not be considered
// to be outside of RDP proper. Functional Reactive Programming (FRP)
// is a similar model with no internal representation of side effects,
// where all state interaction must be accommodated by inputs and
// outputs of the system as a whole.[1] RDP can be seen in a similar
// light, but it can have *internal edges*, letting output sink into a
// handle it gets "on the wire," so to speak, and observing its
// changes again from a related handle. This should make it easier to
// compose stateful systems.
//
// What "on the wire" means is some of the values encoded in an RDP
// signal are momentary capabilities to perform side effects--in fact,
// capabilities whose privilege can be carefully managed using ocap
// philosophy. An RDP programmer can typically expect their programs
// to run with access to several standard general-purpose kinds of
// state, and as RDP systems mature, they should rarely if ever find
// the need to step outside of RDP to get something done.
//
// For more information, see David Barbour's blog at
// <http://awelonblue.wordpress.com/>. David Barbour is the creator of
// the RDP concept, and I (Ross Angle) might see it from a different
// perspective, for better or worse.
//
// [1]
//  http://awelonblue.wordpress.com/2011/05/27/frp-fails-at-the-edges/
//
// ===== About underreact-rdpio.js ===================================
//
// This JavaScript file is a mostly line-for-line translation of a
// small portion of David Barbour's ongoing RDPIO project
// (https://github.com/dmbarbour/RDPIO). The original project is
// written in Haskell. This version's functionality doesn't correspond
// perfectly with the original's, and in particular it erases all the
// valuable static typing of the original, but still, as the original
// RDPIO project is developed, it will hopefully be possible to update
// this port in a straightforwardly corresponding way.
//
// Unfortunately, there are currently no good samples of
// underreact-rdpio.js, RDPIO, or even RDP itself in action.


// PORT NOTE: This version isn't lazy in general. When the original
// has an obvious dependency on laziness, we use a "getFoo" thunk
// instead of a "foo" naked value. Even then, we don't memoize the
// result.
// PORT NOTE: When the original destructures, we use a local variable
// and accessors instead.
// PORT NOTE: We use Arrays for all tuples, even ().
// PORT NOTE: We represent Boolean with JavaScript booleans. Surprise!
// PORT NOTE: We represent Ordering with "lt", "eq", and "gt".
// PORT NOTE: We represent IO with asynchronous JavaScript procedures.
// Specifically, they're procedures that can be told to give up
// instead of doing anything asynchronous, so we should sometimes be
// able to use them in synchronous contexts.
// PORT NOTE: We represent Data.Time.Clock.UTCTime with a finite
// JavaScript number of milliseconds. Specifically, getCurrentTime
// is implemented as "new Date().getTime()".

// PORT NOTE: We're only using the following JavaScript free/global
// variables:
//
// Error, JSON (only in toJson), Date

// PORT TODO: See if we should include maybe even a little bit of the
// original's comments. :-p


// ===================================================================
// Core functionality the port depends on
// ===================================================================

function toJson( string ) {
    return JSON.stringify( string );
}

function makeClass( fields ) {
    return fields;
}

function makeInstance( clazz, instanceFields ) {
    var result = {};
    for ( var k in clazz )
        result[ k ] = clazz[ k ];
    for ( var k in instanceFields )
        result[ k ] = instanceFields[ k ];
    for ( var k in result )
        if ( k === null )
            throw new Error(
                "Tried to make an instance without the field " +
                toJson( k ) + "." );
    return result;
}

// PORT NOTE: Whenever the code relies on the way we're implementing
// the IO monad, whether as a way to construct an IO value or a way to
// deconstruct one, it uses at least one of these two functions.
function asyncIo( op ) {
    return op;
}
function unwrapAsyncIo( op ) {
    return op;
}

function io( op ) {
    return asyncIo( function ( sync, then ) {
        then( null, op() );
        return true;
    } );
}

function id( result ) {
    return result;
}

function kfn( result ) {
    return function ( var_args ) {   // All args are ignored.
        return result;
    };
}

function fst( pair ) { return pair[ 0 ]; }
function snd( pair ) { return pair[ 1 ]; }

function IORef() {}
IORef.prototype.init = function ( val ) {
    this.val = val;
    return this;
};

function newIORef( val ) {
    return io( function () {
        return new IORef().init( val );
    } );
}

function readIORef( ref ) {
    return io( function () {
        return ref.val;
    } );
}

function writeIORef( ref, val ) {
    return io( function () {
        ref.val = val;
        return [];
    } );
}

function atomicModifyIORef( ref, f ) {
    return io( function () {
        var valAndResult = f( ref.val );
        var val = valAndResult[ 0 ], result = valAndResult[ 1 ];
        ref.val = val;
        return result;
    } );
}

function MVar() {}
MVar.prototype.initFull = function ( val ) {
    this.hasVal = true;
    this.val = val;
    this.takeListeners_ = [];
    this.putListeners_ = [];
    return this;
};
MVar.prototype.initEmpty = function () {
    this.initFull( null );
    this.hasVal = false;
    return this;
};
MVar.prototype.take = function ( sync, then ) {
    if ( this.hasVal ) {
        var val = this.val;
        this.val = null, this.hasVal = false;
        if ( this.putListeners_.length !== 0 )
            setTimeout( this.putListeners_.shift(), 0 );
        then( null, val );
        return true;
    }
    if ( sync )
        return false;
    var self = this;
    this.takeListeners_.push( function () {
        self.take( sync, then );
    } );
    return false;
};
MVar.prototype.put = function ( val, sync, then ) {
    if ( !this.hasVal ) {
        this.val = val, this.hasVal = true;
        if ( this.takeListeners_.length !== 0 )
            setTimeout( this.putListeners_.shift(), 0 );
        then( null );
        return true;
    }
    if ( sync )
        return false;
    var self = this;
    this.putListeners_.push( function () {
        self.put( val, sync, then );
    } );
    return false;
};

function newMVar( val ) {
    return io( function () {
        return new MVar().initFull( val );
    } );
}

function takeMVar( mvar ) {
    return asyncIo( function ( sync, then ) {
        return mvar.take( sync, then );
    } );
}

function putMVar( mvar, val ) {
    return asyncIo( function ( sync, then ) {
        return mvar.put( val, sync, function ( e ) {
            if ( e ) return void then( e );
            then( null, [] );
        } );
    } );
}

function tryPutMVar( mvar, val ) {
    return asyncIo( function ( sync, then ) {
        if ( mvar.hasVal )
            return then( null, false ), true;
        return mvar.put( val, sync, function ( e ) {
            if ( e ) return void then( e );
            then( null, true );
        } );
    } );
}

function Chan() {}
Chan.prototype.init = function () {
    this.elements_ = [];
    this.listeners_ = [];
    return this;
};

var newChan = kfn( io( function () {
    return new Chan().init();
} ) );

function readChan( chan ) {
    return asyncIo( function ( sync, then ) {
        if ( chan.elements_.length !== 0 )
            return then( null, chan.elements_.shift() ), true;
        chan.listeners_.push( then );
        return false;
    } );
}

function writeChan( chan, element ) {
    return io( function () {
        chan.elements_.push( element );
        setTimeout( function () {
            if ( chan.listeners_.length !== 0 &&
                chan.elements_.length !== 0 )
                chan.listeners_.shift()(
                    null, chan.elements_.shift() );
        }, 0 );
        return [];
    } );
}

// PORT TODO: Make this work. This will probably involve redesigning
// the IO type's concrete implementation. We will hopefully be able
// to kill a thread that's in a threadDelay before its delay is up,
// without having killThread finish before it's sure the thread has
// stopped. This will mean returning a "break me" operation upon
// operation start, one way or another.
var globalThreadPool = [];
function addThreadToGlobalThreadPool( threadId ) {
    globalThreadPool.push( threadId );
}
function advanceGlobalThreadPool() {
    // PORT TODO: This is pretty much gobbledygook, but it will
    // probably be similar to the final thread-killing code. Write
    // that code, and meanwhile, finish all the rest of
    // advanceGlobalThreadPool() too.
    var threadId = TODO;
    var n = threadId.killedListeners.length;
    if ( n !== 0 ) {
        for ( var i = 0; i < n; i++ )
            setTimeout( threadId.killedListeners[ i ], 0 );
        threadId.io = threadId.killedListeners = null;
        return;
    }
}

function ThreadId() {}
ThreadId.prototype.initAndRun = function ( io ) {
    this.io = io;
    this.killedListeners = [];
    addThreadToGlobalThreadPool( this );
    return this;
};

function forkIO( branch ) {
    return io( function () {
        return new ThreadId().initAndRun( io );
    } );
}

function killThread( threadId ) {
    return asyncIo( function ( sync, then ) {
        if ( threadId.killedListeners === null )
            return then( null, [] ), true;
        threadId.killedListeners.push( function () {
            then( null, [] );
        } );
        return false;
    } );
}

function List_Nil() {}
List_Nil.prototype.init = function () {
    return this;
};

function List_Cons() {}
List_Cons.prototype.initLazy = function ( getCar, getCdr ) {
    this.getCar = function () { return getCar(); };
    this.getCdr = function () { return getCdr(); };
    return this;
};
List_Cons.prototype.init = function ( car, cdr ) {
    return this.initLazy( kfn( car ), kfn( cdr ) );
};

function Maybe_Nothing() {}
Maybe_Nothing.prototype.init = function () {
    return this;
};

function Maybe_Just() {}
Maybe_Just.prototype.init = function ( just ) {
    this.just = just;
    return this;
};

function maybe( onNothing, onJust ) {
    return function ( maybe ) {
        return maybe instanceof Maybe_Nothing ?
            onNothing : onJust( maybe.just );
    };
}

var class_Functor = makeClass( {
    fmap: null
    // PORT TODO: Should we include (<$)?
} );

var class_Monad = makeClass( {
    // (>>=)
    bind: null,
    // return
    ret: null,
    // (>>)
    then: function ( a, b ) {
        return this.bind( a, kfn( b ) );
    }
    // PORT TODO: Should we include fail?
} );

function map( f ) {
    function result( ms ) {
        if ( ms instanceof List_Nil )
            return ms;
        var m = ms.getCar(), rest = ms.getCdr();
        return new List_Cons().initLazy( kfn( f( m ) ), function () {
            return result( rest );
        } );
    };
    return result;
}

function forMDrop( ins_Monad, inputs, f ) {
    if ( inputs instanceof List_Nil )
        return ins_Monad.ret( [] );
    var input = inputs.getCar(), rest = inputs.getCdr();
    return ins_Monad.bind( f( input ), function ( _ ) {
        return forMDrop( ins_Monad, rest, f );
    } );
}

function when( ins_Monad, condition, m ) {
    return condition ? m : ins_Monad.ret( [] );
}

function unless( ins_Monad, condition, m ) {
    return condition ? ins_Monad.ret( [] ) : m;
}

var ins_Maybe_Functor = makeInstance( class_Functor, {
    fmap: function ( fn ) {
        return function ( maybe ) {
            if ( maybe instanceof Maybe_Nothing )
                return maybe;
            return new Maybe_Just().init( fn( maybe.just ) );
        };
    }
} );

var ins_IO_Monad = makeInstance( class_Monad, {
    bind: function ( op, fn ) {
        return asyncIo( function ( sync, then ) {
            var thisSync = true;
            if ( !unwrapAsyncIo( op )( sync, function ( e, result ) {
                if ( e ) return void then( e );
                if ( !unwrapAsyncIo( fn( result ) )( sync, then ) )
                    thisSync = false;
            } ) )
                thisSync = false;
            return thisSync;
        } );
    },
    ret: function ( result ) {
        return io( kfn( result ) );
    }
} );

var class_Eq = makeClass( {
    // (==)
    eq: function ( a, b ) { return !this.neq( a, b ); },
    // (/=)
    neq: function ( a, b ) { return !this.eq( a, b ); }
} );

var class_Ord = makeClass( {
    ins_Eq: null,
    compare: function ( x, y ) {
        return this.ins_Eq.eq( x, y ) ? "eq" :
            this.lte( x, y ) ? "lt" : "gt";
    },
    // (<)
    lt: function ( x, y ) { return this.compare( x, y ) === "lt"; },
    // (<=)
    lte: function ( x, y ) { return this.compare( x, y ) !== "gt"; },
    // (>)
    gt: function ( x, y ) { return this.compare( x, y ) === "gt"; },
    // (>=)
    gte: function ( x, y ) { return this.compare( x, y ) !== "lt"; },
    max: function ( x, y ) { return this.lte( x, y ) ? y : x; },
    min: function ( x, y ) { return this.lte( x, y ) ? x : y; }
} );

var ins_jsNum_Eq = makeInstance( class_Eq, {
    eq: function ( a, b ) {
        return a === b;
    }
} );

var ins_jsNum_Ord = makeInstance( class_Ord, {
    ins_Eq: ins_jsNum_Eq,
    lte: function ( a, b ) {
        return a <= b;
    }
} );

// PORT NOTE: The "v" is for vector.
var class_AdditiveGroup = makeClass( {
    zeroV: null,
    // (^+^)
    vPlusV: null,
    negateV: null
} );

var class_AffineSpace = makeClass( {
    ins_AdditiveGroup: null,
    // (.-.)
    minus: null,
    // (.+^)
    plusV: null
} );

function minusV( ins_AffineSpace, point, vector ) {
    return ins_AffineSpace.plusV(
        point, ins_AffineSpace.ins_AdditiveGroup.negateV( vector ) );
}

// PORT TODO: Implement this more efficiently.
// Data.Map.Map
function Dict() {}
Dict.prototype.init = function () {
    this.contents = [];
    return this;
};
Dict.prototype.copy = function () {
    var result = new Dict();
    result.contents = this.contents.slice();
    return result;
};

// Data.Map.empty
function dictEmpty() {
    return new Dict().init();
}

// PORT TODO: See if this is supposed to return the elements in order.
// Data.Map.elems
function dictElems( dict ) {
    var result = new List_Nil().init();
    for ( var i = this.contents.length - 1; 0 <= i; i-- )
        result = new List_Cons().init( this.contents[ i ].v, result );
    return result;
}

// Data.Map.insert
function dictInsert( ins_Ord, k, v, dict ) {
    var result = dict.copy();
    result.contents.push( { k: k, v: v } )
    return result;
}

// Data.Map.delete
function dictDelete( ins_Ord, k, v, dict ) {
    var result = new Dict().init();
    for ( var i = 0, n = dict.contents.length; i < n; i++ )
        if ( ins_Ord.ins_Eq.neq( dict.contents[ i ].k, k ) )
            result.contents.push( dict.contents[ i ] );
    return result;
}

// Data.Map.null
function dictNull( dict ) {
    return dict.contents.length === 0;
}

var class_Enum = makeClass( {
    succ: null
    // PORT TODO: Should we include the other Enum operations?
} );

// PORT TODO: Actually implement bigints, rather than just providing
// so-called "bigint" operations on JavaScript numbers.
function bigint( literal ) {
    return literal;
}

var ins_bigint_Eq = makeInstance( class_Eq, {
    eq: function ( a, b ) {
        return a === b;
    }
} );

var ins_bigint_Ord = makeInstance( class_Ord, {
    ins_Eq: ins_bigint_Eq,
    lte: function ( a, b ) {
        return a <= b;
    }
} );

var ins_bigint_Enum = makeInstance( class_Enum, {
    succ: function ( n ) {
        return n + 1;
    }
} );

var class_Monoid = makeClass( {
    mempty: null,
    mappend: null
    // PORT TODO: Should we include mconcat?
} );

// Data.Sequence.Sequence
function Sequence() {}
Sequence.prototype.init = function ( contents ) {
    this.contents = contents;
    return this;
};
// PORT NOTE: The original used Data.Foldable.sequence_.
Sequence.prototype.sequenceDrop = function ( ins_Monad ) {
    var result = ins_Monad.ret( [] );
    for ( var i = this.contents.length - 1; 0 <= i; i-- )
        result = ins_Monad.then( this.contents[ i ], result );
    return result;
};

// Data.Sequence.empty
function seqEmpty() {
    return new Sequence().init( [] );
}

// Data.Sequence.singleton
function seqSingleton( v ) {
    return new Sequence().init( [ v ] );
}

// (Data.Sequence.|>)
function seqPush( s, v ) {
    return new Sequence().init( s.contents.concat( [ v ] ) );
}

// Data.Sequence.null
function seqNull( s ) {
    return s.contents.length === 0;
}


// ===================================================================
// Signal.lhs
// ===================================================================

var class_SigTime = makeClass( {
    ins_Ord: null,
    ins_AffineSpace: null,
    ins_Ord_Diff: null
} );

var class_Signal = makeClass( {
    ins_SigTime: null,
    s_invert: null,
    s_never: null,
    s_mask: null,
    s_zip: null,
    s_merge: null,
    s_drop: null,
    su_drop: null,
    s_delay: null,
    su_delay: null,
    // PORT TODO: Make sure to implement su_apply curried, with one
    // parameter leading into one other.
    su_apply: null,
    su_time: null,
    s_future: null,
    s_sample: null,
    s_final: function ( s, t ) {
        return false;
    }
} );

function s_always( ins_Signal ) {
    return ins_Signal.s_invert( ins_Signal.s_never() );
}

function s_term( ins_Signal, s, t ) {
    var sample = ins_Signal.s_sample( s, t );
    var x = sample[ 0 ], sx = sample[ 1 ];
    return x instanceof Maybe_Nothing && ins_Signal.s_final( sx, t );
}

function SigUpT_SUPure() {}
SigUpT_SUPure.prototype.init = function ( transform ) {
    this.transform = transform;
    return this;
};
function SigUpT_SUFuture() {}
SigUpT_SUFuture.prototype.init = function () {
    return this;
};

var class_SigFun = makeClass( {
    ins_Signal: null,
    s_fmap: null,
    su_fmap: function ( f ) {
        return new SigUpT_SUFuture().init();
    }
} );

var class_SigSplit = makeClass( {
    ins_Signal: null,
    s_split: null,
    su_split: function () {
        return new SigUpT_SUFuture().init();
    }
} );

var class_SigPeek = makeClass( {
    ins_Signal: null,
    s_peek: null,
    su_peek: function ( dt ) {
        return new SigUpT_SUFuture().init();
    }
} );

var class_SigSelect = makeClass( {
    ins_Signal: null,
    s_select: null
} );

var class_SigDiscrete = makeClass( {
    ins_Signal: null,
    s_sample_d: null
} );

var class_SigShadow = makeClass( {
    ins_Signal_of: null,
    ins_Signal_as: null,
    s_shadow: null,
    su_shadow: null
} );

var class_SigLift = makeClass( {
    ins_SigShadow: null,
    s_lift: null,
    su_lift: function () {
        return new SigUpT_SUFuture().init();
    }
} );

function ins_Signal_SigShadow( ins_Signal ) {
    return makeInstance( class_SigShadow, {
        ins_Signal_of: ins_Signal,
        ins_Signal_as: ins_Signal,
        s_shadow: id,
        su_shadow: id
    } );
}

function ins_Signal_SigLift( ins_Signal ) {
    return makeInstance( class_SigLift, {
        ins_SigShadow: ins_Signal_SigShadow( ins_Signal ),
        s_lift: id,
        su_lift: function () {
            return new SigUpT_SUPure().init( id );
        }
    } );
}

function s_pure( ins_Functor, ins_Signal, c ) {
    return ins_Functor.fmap( kfn( c ), s_always( ins_Signal ) );
}

function s_ap( ins_Functor, ins_Signal, fs, xs ) {
    return ins_Functor.fmap( function ( fAndX ) {
        var f = fAndX[ 0 ], x = fAndX[ 1 ];
        return f( x );
    }, ins_Signal.s_zip( fs, xs ) );
}

function s_empty( ins_Functor, ins_Signal ) {
    return ins_Signal.s_never();
}

function s_alt( ins_Functor, ins_Signal, a, b ) {
    return ins_Signal.s_merge( b, a );
}

var class_SigAdjeqf = makeClass( {
    ins_Signal: null,
    s_adjeqf: null,
    su_adjeqf: null
} );



// ===================================================================
// Clock.lhs
// ===================================================================

var class_HasClock = makeClass( {
    getTime: null
} );

var class_UTCTimeRep = makeClass( {
    toUTCTime: null,
    fromUTCTime: null
} );

var class_UTCDiffTimeRep = makeClass( {
    toUTCDiffTime: null,
    fromUTCDiffTime: null
} );

var ins_IO_HasClock = makeInstance( class_HasClock, {
    getTime: io( function () { return new Date().getTime(); } )
} );

var ins_jsNumMillis_AdditiveGroup =
    makeInstance( class_AdditiveGroup, {
    zeroV: 0,
    vPlusV: function ( a, b ) { return a + b; },
    negateV: function ( dt ) { return -dt; }
} );

var ins_jsNumTimeMillis_AffineSpace =
    makeInstance( class_AffineSpace, {
    ins_AdditiveGroup: ins_jsNumMillis_AdditiveGroup,
    minus: function ( a, b ) { return a - b; },
    plusV: function ( t, dt ) { return t + dt; }
} );

var ins_jsNumTimeMillis_UTCTimeRep = makeInstance( class_UTCTimeRep, {
    toUTCTime: id,
    fromUTCTime: id
} );

var ins_jsNumMillis_UTCDiffTimeRep =
    makeInstance( class_UTCDiffTimeRep, {
    toUTCDiffTime: id,
    fromUTCDiffTime: id
} );

var ins_jsNumTimeMillis_SigTime = makeInstance( class_SigTime, {
    ins_Ord: ins_jsNum_Ord,
    ins_AffineSpace: ins_jsNumTimeMillis_AffineSpace,
    ins_Ord_Diff: ins_jsNum_Ord
} );



// ===================================================================
// Var.lhs
// ===================================================================

var class_HasVar = makeClass( {
    ins_Monad: null,
    newVar: null,
    readVar: null,
    writeVar: null,
    modifyVar: function ( x, f ) {
        var self = this;
        self.ins_Monad.bind( self.readVar( x ), function ( v ) {
            return self.writeVar( x, f( v ) );
        } );
    }
} );



// Vat.lhs

var class_Vat = makeClass( {
    ins_Monad: null,
    eventually: null,
    spawn: null
} );

var class_TimedVat = makeClass( {
    ins_Vat: null,
    ins_HasClock: null,
    ins_AffineSpace: null,
    atTime: null,
    atTPlus: function ( dt, e ) {
        var self = this;
        self.ins_Vat.ins_Monad.bind( self.ins_HasClock.getTime(),
            function ( t ) {
                return self.atTime(
                    self.ins_AffineSpace.plusDiff( t, dt ), e );
            } );
    }
} );

var class_ClockedVat = makeClass( {
    ins_TimedVat: null,
    setMaxDrift: null,
    getMaxDrift: null,
    setMinCycle: null,
    getMinCycle: null
} );

function newChokedEvent(
    ins_TimedVat, ins_HasVar, ins_Ord, cooldown, op ) {
    
    var m = ins_TimedVat.ins_Monad;
    var c = ins_TimedVat.ins_HasClock;
    return m.bind( op, c.getTime(), function ( tCreate ) {
        return m.bind( ins_HasVar.newVar( [ tCreate, false ] ),
            function ( st ) {
            
            var chokedOp = m.bind( ins_HasVar.readVar( st ),
                function ( stVal ) {
                
                var tMin = stVal[ 0 ], bSched = stVal[ 1 ];
                return m.bind( c.getTime(), function ( tNow ) {
                    if ( ins_Ord.lt( tNow, tMin ) )
                        return unless( m, bSched, m.then(
                            ins_HasVar.writeVar( st, [ tMin, true ] ),
                            ins_TimedVat.atTime( tMin, chokedOp ) ) );
                    var tNext = ins_TimedVat.ins_AffineSpace.plusDiff(
                        tNow, cooldown );
                    return m.then(
                        ins_HasVar.writeVar( st, [ tNext, false ] ),
                        op );
                } );
            } );
            return m.ret( chokedOp );
        } );
    } );
}



// ===================================================================
// Behavior.lhs
// ===================================================================

function bfwd( ins_Category ) {
    return ins_Category.id();
}

var class_BSig = makeClass( {
    ins_Category: null,
    ins_Signal: null,
    bfmap: null,
    bunit: null,
    buconv: null,
    bconv: null
} );

// bdrop :: (BSig b u t, SigShadow s u t, SigShadow u s t)
//     => b x (s ())
function bdrop( ins_BSig, ins_SigShadow_in, ins_SigShadow_out ) {
    int_BSig.ins_Category.then( int_BSig.bunit(),
        int_BSig.buconv( ins_SigShadow_in, ins_SigShadow_out ) );
}

var class_BDelay = makeClass( {
    ins_SigTime: null,
    bdelay: null,
    bsynch: null
} );

var class_BProdBase = makeClass( {
    ins_Category: null,
    bdup: null,
    bswap: null,
    bfst: null,
    bsnd: function () {
        return this.ins_Category.then( this.bswap(), this.bfst() );
    },
    bassoclp: null,
    bassocrp: function () {
        var c = this.ins_Category;
        var swap3 =
            c.then( this.bfirst( this.bswap() ), this.bswap() );
        return c.then( swap3, c.then( this.bassoclp(), swap3 ) );
    },
    bfirst: null,
    bsecond: function ( f ) {
        var c = this.ins_Category;
        return c.then( this.bswap(),
            c.then( this.bfirst( f ), this.bswap() ) );
    },
    // (***)
    bboth: function ( f, g ) {
        return this.ins_Category.then(
            this.bfirst( f ), this.bsecond( g ) );
    },
    // (&&&)
    bdupboth: function ( f, g ) {
        return this.ins_Category.then(
            this.bdup(), this.bboth( f, g ) );
    }
} );

var class_BProd = makeClass( {
    ins_BProdBase: null,
    bzip: null
} );

var class_BProdBase = makeClass( {
    ins_Category: null,
    bmerge: null,
    bmirror: null,
    binl: null,
    binr: function () {
        return this.ins_Category.then( this.binl(), this.bmirror() );
    },
    bassocls: null,
    bassocrs: function () {
        var c = this.ins_Category;
        var mirror3 =
            c.then( this.bleft( this.bmirror() ), this.bmirror() );
        return c.then( mirror3, c.then( this.bassocls(), mirror3 ) );
    },
    bleft: null,
    bright: function ( f ) {
        var c = this.ins_Category;
        return c.then( this.bmirror(),
            c.then( this.bleft( f ), this.bmirror() ) );
    },
    // (+++)
    bwhichever: function ( f, g ) {
        return this.ins_Category.then(
            this.bleft( f ), this.bright( g ) );
    },
    // (|||)
    bwhichevermerge: function ( f, g ) {
        return this.ins_Category.then(
            this.bwhichever( f, g ), this.bmerge() );
    }
} );

var class_BSum = makeClass( {
    ins_BSumBase: null,
    bsplit: null
} );

var class_BJoin = makeClass( {
    ins_BProdBase: null,
    ins_BSumBase: null,
    bdisjoinl: null,
    bdisjoinr: function () {
        var p = this.ins_BProdBase;
        var c = p.ins_Category;
        return c.then( p.bswap(), c.then( this.bdisjoinl(),
            this.ins_BSumBase.bwhichever( p.bswap(), p.bswap() ) ) );
    },
    bconjoinl: null,
    bconjoinr: function () {
        var p = this.ins_BProdBase;
        var c = p.ins_Category;
        return c.then(
            this.ins_BSumBase.bwhichever( p.bswap(), p.bswap() ),
            c.then( this.bconjoinl(), p.bswap() ) );
    }
} );

var class_BPeek = makeClass( {
    ins_BSum: null,
    ins_SigTime: null,
    bpeek: null
} );

var class_BDyn = makeClass( {
    ins_BSig: null,
    ins_BProdBase: null,
    ins_BSumBase: null,
    beval: null,
    bexec: null
} );

var class_BLift = makeClass( {
    blift: null
} );



// ===================================================================
// VatCB.lhs
// ===================================================================

var class_VatCB = makeClass( {
    ins_Vat: null,
    ins_Callable: null,
    mkcb0: null
} );

function mkcb( ins_VatCB, op ) {
    return ins_VatCB.mkcb0( function ( xAndYcb ) {
        var x = xAndYcb[ 0 ], ycb = xAndYcb[ 1 ];
        return ins_VatCB.ins_Vat.ins_Monad.bind( op( x ),
            function ( y ) {
                return ins_VatCB.ins_Callable.call0( ycb( y ) );
            } );
    } );
}

function pip( ins_Callable, fxy, fyz, xAndZcb ) {
    var x = xAndZcb[ 0 ], zcb = xAndZcb[ 1 ];
    function ycb( y ) {
        return fyz( [ y, zcb ] );
    }
    return fxy( [ x, ycb ] );
}

function tee( ins_Callable, fn ) {
    return function ( xAndXcb ) {
        var x = xAndXcb[ 0 ], xcb = xAndXcb[ 1 ];
        var m = ins_Callable.ins_Monoid;
        return m.mappend( fn( [ x, kfn( m.mempty() ) ] ), xcb( x ) );
    };
}

var class_Callable = makeClass( {
    ins_Monad: null,
    ins_Monoid: null,
    call0: null
} );

function call( ins_Callable, fn, x, ycb ) {
    return ins_Callable.call0( fn( [ x, ycb ] ) );
}

function calldrop( ins_Callable, fn, x ) {
    return ins_Callable.call0(
        fn( [ x, kfn( ins_Callable.ins_Monoid.mempty() ) ] ) );
}

var class_ChanCB = makeClass( {
    ins_Callable: null,
    mkcbChan: null
} );

function callAndWait( ins_ChanCB, fn, x ) {
    var m = ins_IO_Monad;
    return m.bind( newChan(), function ( ch ) {
    return m.bind( ins_ChanCB.mkcbChan( id, ch ), function ( chcb ) {
        return m.then( call( ins_ChanCB.ins_Callable, fn, x, chcb ),
            readChan( ch ) );
    } );
    } );
}

var class_StepCB = makeClass( {
    ins_Callable: null,
    mkcbRedirect: null,
    mkcbProc: function ( cbp0 ) {
        var c = this.ins_Callable;
        return c.ins_Monad.bind( this.mkcbRedirect(),
            function ( curAndUpd ) {
                var cur = curAndUpd[ 0 ], upd = curAndUpd[ 1 ];
                var step0 = cbpStepper( c.ins_Monoid, upd, cbp0 );
                return c.ins_Monad.then(
                    c.call0( upd, step0 ), c.ins_Monad.ret( cur ) );
            } );
    }
} );

function cbpStepper( ins_Monoid, upd, cbp ) {
    return function ( x ) {
        var cbNowAndCbpPrime = cbp.runCBProc( x );
        var cbNow = cbNowAndCbpPrime[ 0 ];
        var cbpPrime = cbNowAndCbpPrime[ 1 ];
        var next = cbpStepper( upd, cbpPrime );
        return ins_Monoid.mappend( upd( next ), cbNow );
    };
}

function CBProc_CBProc() {}
CBProc_CBProc.prototype.init = function ( runCBProc ) {
    this.runCBProc = function ( x ) {
        return runCBProc( x );
    };
    return this;
};

function cbpAlways( fn ) {
    var cbp = new CBProc_CBProc().init( function ( x ) {
        return [ fn( x ), cbp ];
    } );
    return cbp;
}

function cbpNever( ins_Monoid ) {
    return cbpAlways( kfn( ins_Monoid.mempty() ) );
}

function cbpCons( fn, getCbp ) {
    return new CBProc_CBProc().init( function ( x ) {
        return [ fn( x ), getCbp() ];
    } );
}

function cbpFromList( ins_Monoid, list ) {
    if ( list instanceof List_Nil )
        return cbpNever( ins_Monoid );
    var x = list.getCar(), xs = list.getCdr();
    return cbpCons( x, function () { return cbpFromList( xs ); } );
}

function mkcbOnce0( ins_VatCB, ins_StepCB, op ) {
    return ins_VatCB.ins_Callable.ins_Monad.bind(
        ins_VatCB.mkcb0( op ), function ( fn ) {
            return ins_StepCB.mkcbProc( cbpCons( fn, function () {
                return cbpNever( ins_VatCB.ins_Callable.ins_Monoid );
            } ) );
        } );
}

function mkcbOnce( ins_VatCB, ins_StepCB, op ) {
    return mkcbOnce0( ins_VatCB, ins_StepCB, function ( aAndBcb ) {
        var a = aAndBcb[ 0 ], bcb = aAndBcb[ 1 ];
        var c = ins_VatCB.ins_Callable;
        return c.ins_Monad.bind( op( a ), function ( b ) {
            return c.call0( bcb( b ) );
        } );
    } );
}

function method( ins_VatCB, op ) {
    return mkcb( ins_VatCB, op );
}

function monce( ins_VatCB, ins_StepCB, op ) {
    return mkcbOnce( ins_VatCB, ins_StepCB, op );
}



// ===================================================================
// Link.lhs
// ===================================================================

function LinkUp_LinkUp() {}
LinkUp_LinkUp.prototype.init = function ( lu_update, lu_stable ) {
    this.getLu_update = function () { return lu_update; };
    this.getLu_stable = function () { return lu_stable; };
    return this;
};

function lu_time( ins_Signal, linkUp ) {
    return ins_Maybe_Functor.fmap( function ( lu_update ) {
        return ins_Signal.su_time( lu_update );
    } )( linkUp.getLu_update() );
}

function luTerminate( ins_Signal, tmTerm ) {
    var su = ins_Signal.s_future( tmTerm, ins_Signal.s_never() );
    return new LinkUp_LinkUp.init(
        new Maybe_Just().init( su ), new Maybe_Nothing().init() );
}

var class_Link = makeClass( {
    ins_Vat: null,
    ins_BSig: null,
    mkLink: null,
    mkLinkDrop: null
} );

var class_BLink = makeClass( {
    ins_HasVar: null,
    ins_Link: null,
    // -- | Build a full BLink, with developer maintaining response.
    // mkBLink :: (SigShadow s' u t, SigShadow u s' t)
    //         => BLMeta
    //         -> st     -- initial state for new links
    //         -> ((BLRec t v st s' r) -> (LinkUp t s d) -> v ())
    //             -- event callback
    //         -> v (b (s d) (s' r))  -- produces new agent
    mkBLink: null
} );

// mkBLink_ ::
//     (BLink v b u t, BProd b, SigShadow u s t, SigShadow s u t)
//     => st -> ((BLRec t v st s ()) -> (LinkUp t s d) -> v ())
//     -> v (b (s d) (s ()))
function mkBLinkDrop( ins_BLink, ins_BProd,
    ins_SigShadow_out, ins_SigShadow_in, s0, cb ) {
    
    var m = ins_BLink.ins_HasVar.ins_Monad;
    var p = ins_BProd.ins_BProdBase;
    var s = ins_BLink.ins_Link.ins_BSig;
    var c = s.ins_Category;
    return m.bind(
        ins_BLink.mkBLink( ins_SigShadow_in, ins_SigShadow_out,
            blMetaDefault, s0, cb ),
        function ( f ) {
            return m.ret( c.then( p.bdup(), c.then(
                p.bboth( f,
                    bdrop( s, ins_SigShadow_in, ins_SigShadow_out ) ),
                p.bsnd() ) ) );
        } );
}

function BLRec_BLRec() {}
BLRec_BLRec.prototype.init = function ( bl_state, bl_link, bl_drop ) {
    this.getBl_state = function () { return bl_state; };
    this.getBl_link = function () { return bl_link; };
    this.getBl_drop = function () { return bl_drop; };
    return this;
};

function BLMeta_BLMeta() {}
BLMeta_BLMeta.prototype.init = function (
    bl_query, bl_tsen, bl_show ) {
    
    this.getBl_query = function () { return bl_query; };
    this.getBl_tsen = function () { return bl_tsen; };
    this.getBl_show = function () { return bl_show; };
    return this;
};

var blMetaDefault =
    new BLMeta_BLMeta( !"bl_query", !!"bl_tsen", "BLink" );

function linkUpdate(
    ins_Monad, ins_Signal, ins_HasClock, dt, luSend ) {
    
    var s = ins_Signal.ins_SigTime;
    var a = s.ins_AffineSpace;
    var dtf = s.ins_Ord.ins_Eq.eq(
        dt, a.ins_AdditiveGroup.zeroV() ) ? id :
        function ( t ) { return a.plusV( t, dt ); };
    return function ( sig ) {
        ins_Monad.bind( ins_HasClock.getTime(), function ( tNow ) {
            var tm = dtf( tNow );
            var su = ins_Signal.s_future( tm, sig );
            var lu = new LinkUp_LinkUp().init(
                new Maybe_Just().init( su ),
                new Maybe_Just().init( tm ) );
            return luSend( lu );
        } );
    };
}

// mkLinkRef :: (BLink v b u t, SigShadow s u t, SigShadow u s t)
//           => String                    -- ^ debug string
//           -> Diff t                    -- ^ extra history to keep
//           -> v ((LinkUp t s x -> v ()) -- ^ to update the reference
//                ,b (s ()) (s x)         -- ^ to share the reference
//                )
function mkLinkRef(
    ins_BLink, ins_SigShadow_out, ins_SigShadow_in, sDebug, dtHist ) {
    
    var ignoreSub = kfn( ins_BLink.ins_HasVar.ins_Monad.ret( [] ) );
    return mkLinkRefD( ins_BLink, ins_SigShadow_out, ins_SigShadow_in,
        sDebug, ignoreSub, dtHist );
}

// mkLinkRefD :: (BLink v b u t, SigShadow s u t, SigShadow u s t)
//            => String                 -- ^ debug string
//            -> (Bool -> v ())         -- ^ event indicating interest
//            -> Diff t                 -- ^ extra history to keep
//            -> v ((LinkUp t s x -> v ())
//                                      -- ^ to update the reference
//                 ,b (s ()) (s x)      -- ^ to share the reference
//                 )
function mkLinkRefD( ins_BLink, ins_SigShadow_out, ins_SigShadow_in,
    sDebug, onSub, dtHist ) {
    
    var v = ins_BLink.ins_HasVar;
    var ins_Vat = ins_BLink.ins_Link.ins_Vat;
    var m = v.ins_Monad;
    var a = ins_BLink.ins_Link.ins_BSig.ins_Signal.ins_SigTime.
        ins_AffineSpace;
    // PORT NOTE: This is the instance "Signal s" corresponding to s
    // in the above type signature. We can also get the "Signal u"
    // instance, but we don't use that for anything; the SigShadows
    // are just there to communicate with the "Vat v".
    var s = ins_SigShadow_out.ins_Signal_of;
    
    var fdt = s.ins_Ord.ins_Eq.eq(
        dtHist, a.ins_AdditiveGroup.zeroV() ) ? id :
        function ( t ) { return minusV( a, t, dtHist ); };
    return m.bind( v.newVar( new Maybe_Nothing().init() ),
        function ( vSig ) {
    return m.bind( v.newVar( [ bigint( 1 ), dictEmpty() ] ),
        function ( vObs ) {
    var onLU = lrefOnLU( s, ins_Vat, v, fdt, onSub, vSig, vObs );
    var onBL = lrefOnBL( s, ins_Vat, v, onSub, vSig, vObs );
    var blm =
        new BLMeta_BLMeta().init( !!"bl_query", !!"bl_tsen", sDebug );
    var st0 = [ 0, [ s.s_never(), new Maybe_Nothing().init() ] ];
    return m.bind(
        ins_BLink.mkBLink( ins_SigShadow_in, ins_SigShadow_out,
            blm, st0, onBL ),
        function ( bl ) {
    return m.ret( [ onLU, bl ] );
    } );
    } );
    } );
}

function lrefOnBL(
    ins_Signal, ins_Vat, ins_HasVar, onSub, vSig, vObs ) {
    
    return function ( blr, lu ) {
        var h = ins_HasVar;
        var m = h.ins_Monad;
        return m.bind( h.readVar( blr.getBl_state() ),
            function ( ixAndS0And_ ) {
        var ix = ixAndS0And_[ 0 ], s0 = ixAndS0And_[ 1 ][ 0 ];
        return m.bind( h.readVar( vSig ), function ( ls ) {
        var sf = maybe( s0, ins_Signal.su_apply( s0 ) )(
            lu.getLu_update() );
        var tf = lu.getLu_stable();
        if ( ls instanceof Maybe_Nothing )
            return m.then(
                h.writeVar( blr.getBl_state(), [ ix, [ sf, tf ] ] ),
                lrefSubscribe( ins_Signal, ins_Vat, h,
                    onSub, vObs, blr ) );
        var slAndTl = ls.just;
        var sl = slAndTl[ 0 ], tl = slAndTl[ 1 ];
        var tx = tmin( ins_Signal.ins_SigTime.ins_Ord, tl, tf );
        var sfc = maybe( ins_Signal.s_never(), function ( tx ) {
            return snd( ins_Signal.s_sample( sf, tx ) );
        } )( tx );
        var bdone = maybe( true, function ( tx ) {
            return s_term( ins_Signal, sfc, tx );
        } )( tx );
        var autoSubscribe = bdone ? lrefUnsubscribe : lrefSubscribe;
        var lsm = ins_Signal.s_mask( sl, sf );
        var tu = lu_time( ins_Signal, lu );
        var slu = ins_Maybe_Functor.fmap( function ( tu ) {
            return ins_Signal.s_future( tu, slm );
        } )( tu );
        var lux = new LinkUp_LinkUp().init( slu, tx );
        return m.then(
            h.writeVar( blr.getBl_state(), [ ix, [ sfc, tf ] ] ),
            m.then(
                autoSubscribe(
                    ins_Signal, ins_Vat, h, onSub, vObs, blr ),
                blr.getBl_link()( lux ) ) );
        } );
        } );
    };
}

function lrefOnLU(
    ins_Signal, ins_Vat, ins_HasVar, cutHist, onSub, vSig, vObs ) {
    
    return function ( lu ) {
        var h = ins_HasVar;
        var m = ins_Vat.ins_Monad;
        return m.bind( h.readVar( vSig ), function ( ls ) {
        var tl = lu.getLu_stable();
        var sl0 = maybe( ins_Signal.s_never(), fst )( ls );
        var sl = maybe( sl0, ins_Signal.su_apply( sl0 ) )(
            lu.getLu_update() );
        var sfc = maybe( ls, function ( tl ) {
            return snd( ins_Signal.s_sample( sl, cutHist( tl ) ) );
        } )( tl );
        return m.then(
            h.writeVar( vSig, new Maybe_Just().init( [ slc, tl ] ) ),
            m.bind( h.readVar( vObs ), function ( _AndOmap ) {
            var omap = _AndOmap[ 1 ];
            return forMDrop( m, dictElems( omap ), function ( blr ) {
                return m.bind( h.readVar( blr.getBl_state ),
                    function ( ixAndSdAndTd ) {
                var ix = ixAndSdAndTd[ 0 ];
                var sd = ixAndSdAndTd[ 1 ][ 0 ];
                var td = ixAndSdAndTd[ 1 ][ 1 ];
                var tx = tmin(
                    ins_Signal.ins_SigTime.ins_Ord, tl, td );
                var sdc = maybe( ins_Signal.s_never(),
                    function ( tx ) {
                    
                    return snd( ins_Signal.s_sample( sd, tx ) );
                } )( tx );
                var bdone = maybe( true, function ( tx ) {
                    return s_term( ins_Signal, sdc, tx );
                } )( tx );
                var slm = ins_Signal.s_mask( sl, sd );
                var tu = lu_time( ins_Signal, lu );
                var slu = ins_Maybe_Functor.fmap( function ( tu ) {
                    return ins_Signal.s_future( tu, slm );
                } )( tu );
                var lux = new LinkUp_LinkUp().init( slu, tx );
                return m.then(
                    h.writeVar(
                        blr.getBl_state(), [ ix, [ sdc, td ] ] ),
                    m.then(
                        when( m, bdone,
                            lrefUnsubscribe( ins_Signal, ins_Vat, h,
                                onSub, vObs, blr ) ),
                        blr.getBl_link()( lux ) ) );
                } );
            } );
            } ) );
        } );
    };
}

function lrefSubscribe(
    ins_Signal, ins_Vat, ins_HasVar, onSub, vObs, blr ) {
    
    var h = ins_HasVar;
    var m = ins_Vat.ins_Monad;
    return m.bind( v.readVar( blr.getBl_state() ),
        function ( ixAndSig ) {
        
        var ix = ixAndSig[ 0 ], sig = ixAndSig[ 1 ];
        return when( m, ins_bigint_Eq.eq( ix, bigint( 0 ) ),
            m.bind( v.readVar( vObs ), function ( iNxtAndM ) {
                var iNxt = iNxtAndM[ 0 ], m = iNxtAndM[ 1 ];
                var mPrime =
                    dictInsert( ins_bigint_Ord, iNxt, blr, m );
                var iNxtPrime = ins_bigint_Enum.succ( iNxt );
                return m.then(
                    v.writeVar( blr.getBl_state(), [ iNxt, sig ] ),
                    m.then( v.writeVar( vObs, [ iNxtPrime, mPrime ] ),
                        when( m, dictNull( m ),
                            ins_Vat.eventually( onSub( true ) )
                        ) ) );
             } ) );
    } );
}

function lrefUnsubscribe(
    ins_Signal, ins_Vat, ins_HasVar, onSub, vObs, blr ) {
    
    var h = ins_HasVar;
    var m = ins_Vat.ins_Monad;
    return m.bind( v.readVar( blr.getBl_state() ),
        function ( ixAndSig ) {
        
        var ix = ixAndSig[ 0 ], sig = ixAndSig[ 1 ];
        return when( m, ins_bigint_Eq.neq( ix, bigint( 0 ) ),
            m.then( v.writeVar( blr.getBl_state(), [ 0, sig ] ),
                m.bind( v.readVar( vObs ), function ( iNxtAndM ) {
                    var iNxt = iNxtAndM[ 0 ], m = iNxtAndM[ 1 ];
                    var mPrime = dictDelete( ins_bigint_Ord, ix, m );
                    return m.then(
                        v.writeVar( vObs, [ iNxt, mPrime ] ),
                        when( m, dictNull( mPrime ),
                            ins_Vat.eventually( onSub( false ) )
                        ) );
                } ) ) );
    } );
}

function tmin( ins_Ord, x, y ) {
    if ( x instanceof Maybe_Nothing ) return y;
    if ( y instanceof Maybe_Nothing ) return x;
    return new Maybe_Just().init( ins_Ord.min( x.just, y.just ) );
}



// ===================================================================
// RDPIO/Queue.lhs
// ===================================================================

function Queue_Q() {}
Queue_Q.prototype.init = function ( q ) {
    this.q = q;
    return this;
};

function nullQ( q ) {
    return seqNull( q.q );
}

function emptyQ() {
    return new Queue_Q().init( seqEmpty() );
}

function runQ( ins_Monad, q ) {
    return q.q.sequenceDrop( ins_Monad );
}

function pushQ( op, q ) {
    return new Queue_Q().init( seqPush( q.q, op ) );
};

function singleQ( op ) {
    return new Queue_Q().init( seqSingleton( op ) );
}



// ===================================================================
// RDPIO/CSched.lhs
// ===================================================================

function CSched_CSched() {}
CSched_CSched.prototype.init = function ( obj ) {
    this.getCs_time = kfn( obj.cs_time );
    this.getCs_time_x = kfn( obj.cs_time_x );
    this.getCs_schedule = kfn( obj.cs_schedule );
    this.getCs_reg_new = kfn( obj.cs_reg_new );
    this.getCs_reg_add = kfn( obj.cs_reg_add );
    this.getCs_reg_upd = kfn( obj.cs_reg_upd );
    this.getCs_reg_clr = kfn( obj.cs_reg_clr );
    return this;
};



// ===================================================================
// RDPIO/Ref.lhs
// ===================================================================

function Ref_Ref() {}
Ref_Ref.prototype.init = function ( ref ) {
    this.ref = ref;
    return this;
};

function newRef( s0 ) {
    return ins_IO_Monad.bind( newIORef( s0 ), function ( ref ) {
    return ins_IO_Monad.ret( new Ref_Ref().init( ref ) );
    } );
}

function readRef( ref ) {
    return readIORef( ref.ref );
}

function writeRef( ref, val ) {
    return writeIORef( ref.ref, val );
}

function modifyRef( ref, f ) {
    return atomicModifyIORef( ref.ref, f );
}

// PORT TODO: The point of modifyRefPrime seems to be to have an eager
// alternatice to modifyRef, so we've just implemented it like this.
// See if modifyRef should be lazy.
function modifyRefPrime( ref, f ) {
    return modifyRef( ref, f );
};



// ===================================================================
// RDPIO/CSchedIO.lhs
// ===================================================================

function newCSchedIO( ins_Ord_uid, ins_Ord_t, ioT, dt2us ) {
    var ouid = ins_Ord_uid;
    var ot = ins_Ord_t;
    var m = ins_IO_Monad;
    return m.bind( newClock( ouid, ot, ioT, dt2us ),
        function ( clock ) {
    var cs = new CSched_CSched().init( {
        // PORT TODO: Implement liftM.
        cs_time: liftM( m, fst )( getClockTime( ouid, ot, clock ) ),
        cs_time_x: function ( uid ) {
            return liftM( m, fst )(
                getClockTimeX( ouid, ot, clock, uid ) );
        },
        cs_schedule: function ( vSync, tWakeup ) {
            return sleep( ot, clock, vSync, tWakeup );
        },
        cs_reg_new: function ( ix, wdt ) {
            return newActivity( ouid, ot, clock, ix, wdt );
        },
        cs_reg_add: function ( ix, t ) {
            return addActivity( ouid, ot, clock, ix, t );
        },
        cs_reg_upd: function ( ix, tReg, ts ) {
            return updActivity( ouid, ot, clock, ix, tReg, ts );
        },
        cs_reg_clr: function ( ix, ts ) {
            return clrActivity( ouid, ot, clock, ix, ts );
        }
    } );
    return m.ret( cs );
    } );
};

function Clock_Clock() {}
Clock_Clock.prototype.init = function ( obj ) {
    this.getRegistry = kfn( obj.registry );
    this.getSleepers = kfn( obj.sleepers );
    this.getSetTimer = kfn( obj.setTimer );
    this.getIoTime = kfn( obj.ioTime );
    return this;
};

function newClock( ins_Ord_uid, ins_Ord_t, ioT, diffT ) {
    var m = ins_IO_Monad;
    // PORT TODO: The original used mfix here. See if this local
    // variable is sufficient.
    // PORT TODO: Implement emptyReg.
    var thisClock = m.bind( newRef( emptyReg() ), function ( x ) {
    // PORT TODO: Implement emptyQSleep.
    return m.bind( newRef( emptyQSleep() ), function ( s ) {
    return m.bind(
        newTimer( ins_Ord_t, ioT, diffT,
            wakeup( ins_Ord_uid, ins_Ord_t, thisClock ) ),
        function ( tr ) {
    return m.ret( new Clock_Clock().init( {
        registry: x,
        sleepers: s,
        setTimer: tr,
        ioTime: ioT
    } ) );
    } );
    } );
    } );
    return thisClock;
}

function getClockTime( ins_Ord_uid, ins_Ord_t, clock ) {
    return ins_IO_Monad.bind( clock.getIoTime(), function ( currT ) {
    return getClockTimePrime( ins_Ord_uid, ins_Ord_t, clock, currT );
    } );
}

function getClockTimePrime( ins_Ord_uid, ins_Ord_t, clock, maxT ) {
    var m = ins_IO_Monad;
    return m.bind( readRef( clock.getRegistry() ), function ( reg ) {
        // PORT TODO: Implement registryTime.
        var t = registryTime( ins_Ord_t, ins_Ord_uid, reg );
        if ( t instanceof Maybe_Nothing )
            return m.ret( [ maxT, false ] );
        return m.ret( ins_Ord_t.lt( maxT, rt ) ? [ maxT, false ] :
            [ rt, true ] );
    } );
}

function getClockTimeX( ins_Ord_uid, ins_Ord_t, clock, ix ) {
    var m = ins_IO_Monad;
    return m.bind( clock.getIoTime(), function ( currT ) {
        return getClockTimeXPrime(
            ins_Ord_uid, ins_Ord_t, clock, ix, currT );
    } );
}

function getClockTimeX( ins_Ord_uid, ins_Ord_t, clock, ix, maxT ) {
    var m = ins_IO_Monad;
    return m.bind( readRef( clock.getRegistry() ), function ( reg ) {
        // PORT TODO: Implement registryTimeX.
        var t = registryTime( ins_Ord_t, ins_Ord_uid, ix, reg );
        if ( t instanceof Maybe_Nothing )
            return m.ret( [ maxT, false ] );
        return m.ret( ins_Ord_t.lt( maxT, rt ) ? [ maxT, false ] :
            [ rt, true ] );
    } );
}

function wakeup( ins_Ord_uid, ins_Ord_t, clock ) {
    return function ( currT ) {
        var m = ins_IO_Monad;
        return m.bind(
            getClockTimePrime( ins_Ord_uid, ins_Ord_t, clock, currT ),
            function ( clockTAndBBounded ) {
        var clockT = clockTAndBBounded[ 0 ];
        var bBounded = clockTAndBBounded[ 1 ];
        return m.then(
            wakeupSleepers( ins_Ord_t, clock.getSleepers(), clockT ),
            unless( bBounded )(
                // PORT TODO: Implement resetTimer.
                resetTimer( ins_Ord_uid, ins_Ord_t, clock ) ) );
        } );
    };
}

function sleep( ins_Ord, clock, vSync, tWakeup ) {
    function addSleeper( qs ) {
        // PORT TODO: Implement gotoSleep.
        var qsPrime = gotoSleep( tWakeup, vSync, gs );
        // PORT TODO: Implement sleepersTime.
        var bUpd = ins_Ord.ins_Eq.neq(
            sleepersTime( qs ), sleepersTime( qsPrime ) );
        return [ qsPrime, bUpd ];
    }
    ins_IO_Monad.bind(
        modifyRefPrime( clock.getSleepers(), addSleeper ),
        function ( bReset ) {
        
        return when( bReset )( clock.getSetTimer()( tWakeup ) )
    } );
}

function wakeupNow( ins_Ord_uid, ins_Ord_t, clock ) {
    return ins_IO_Monad.bind( clock.getIoTime(), function ( tNow ) {
        return wakeup( ins_Ord_uid, ins_Ord_t, clock )( tNow );
    } );
}

function resetTimer( ins_Ord_uid, ins_Ord_t, clock ) {
    return ins_IO_Monad.bind( readRef( clock.getSleepers() ),
        function ( s ) {
    // PORT TODO: Implement sleepersTime.
    var nextT = sleepersTime( s );
    if ( nextT instanceof Maybe_Nothing )
        return ins_IO_Monad.ret( [] );
    // PORT TODO: Implement setTimer.
    return setTimer( clock, nextT.just );
    } );
}

function newActivity( ins_Ord_uid, ins_Ord_t, clock, ix, wdt ) {
    return ins_IO_Monad.bind( clock.getIoTime(), function ( currT ) {
    return modifyRef( clock.getRegistry(), ins( currT ) );
    function ins( tCurr ) {
        return function ( s ) {
            // PORT TODO: Implement registryTimeX.
            var tLimit =
                registryTimeX( ins_Ord_t, ins_Ord_uid, ix, s );
            var tClock = maybe( tCurr, function ( t ) {
                return ins_Ord_t.min( tCurr, t );
            } )( tLimit );
            var tReg = wdt( tClock );
            // PORT TODO: Implement addReg.
            var sPrime =
                addReg( ins_Ord_t, ins_Ord_uid, ix, tReg, s );
            return [ sPrime, [ tClock, tReg ] ];
        };
    }
    } );
}

function addActivity( ins_Ord_uid, ins_Ord_t, clock, ix, t ) {
    return modifyRef( clock.getRegistry(), ins );
    function ins( s ) {
        // PORT TODO: Implement addReg.
        var sPrime = addReg( ins_Ord_t, ins_Ord_uid, ix, t, s );
        return [ sPrime, [] ];
    }
}

function clrActivity( ins_Ord_uid, ins_Ord_t, clock, ix, ts ) {
    if ( ts instanceof List_Nil )
        return [];
    return ins_IO_Monad.bind( modifyRef( clock.getRegistry(), del ),
        function ( bUpd ) {
    return when( bUpd )( wakeupNow( ins_Ord_uid, ins_Ord_t, clock ) );
    } );
    function del( s ) {
        // PORT TODO: Implement delRegList.
        var sPrime = delRegList( ins_Ord_t, ins_Ord_uid, ix, ts, s );
        // PORT TODO: Implement registryTime.
        var bUpd = ins_Ord_t.ins_Eq.neq(
            registryTime( ins_Ord_t, ins_Ord_uid, s ),
            registryTime( ins_Ord_t, ins_Ord_uid, sPrime ) );
        return [ sPrime, bUpd ];
    }
}

function updActivity( ins_Ord_uid, ins_Ord_t, clock, ix, tReg, ts ) {
    return ins_IO_Monad.bind( modifyRef( clock.getRegistry(), upd ),
        function ( bUpd ) {
    return when( bUpd )( wakeupNow( ins_Ord_uid, ins_Ord_t, clock ) );
    } );
    function upd( s ) {
        // PORT TODO: Implement updReg.
        var sPrime =
            updReg( ins_Ord_t, ins_Ord_uid, ix, tReg, ts, s );
        // PORT TODO: Implement registryTime.
        var bUpd = ins_Ord_t.ins_Eq.neq(
            registryTime( ins_Ord_t, ins_Ord_uid, s ),
            registryTime( ins_Ord_t, ins_Ord_uid, sPrime ) );
        return [ sPrime, bUpd ];
    }
}

function newTimer( ins_Ord_t, ioT, diffT, alert ) {
    return ins_IO_Monad.bind( newMVar( [] ), function ( mx ) {
    return ins_IO_Monad.bind( newRef( new Maybe_Nothing().init() ),
        function ( st ) {
    return ins_IO_Monad.ret(
        setTimerPrime( ins_Ord_t, ioT, diffT, alert, mx, st ) );
    } );
    } );
}

function setTimerPrime( ins_Ord_t, ioT, diffT, alert, mx, st ) {
    return function ( t ) {
        var m = ins_IO_Monad;
        
        var reset = m.bind( readRef( st ), function ( s0 ) {
            if ( s0 instanceof Maybe_Nothing )
                return forkTimerThread;
            var t0 = s0.just[ 0 ], i0 = s0.just[ 1 ];
            return when( ins_Ord_t.lt( t, t0 ) )(
                m.then( killThread( i0 ), forkTimerThread ) );
        } );
        
        var forkTimerThread = m.bind(
            // PORT TODO: Implement timerThread.
            forkIO( timerThread(
                ins_Ord_t, ioT, diffT, alert, mx, st, t ) ),
            function ( i ) {
                return writeRef( st,
                    [ new Maybe_Just().init( [ t, i ] ) ] );
            } );
        
        return m.then(
            takeMVar( mx ), m.then( reset, putMVar( mx, [] ) ) );
    };
}

// PORT TODO: Port the following.
/*
type DT2US t = t -> t -> Int


-- wait until a specific time, then execute the event.
timerThread :: (Ord t) 
            => IO t 
            -> DT2US t
            -> (t -> IO ())
            -> MVar ()
            -> Ref (Maybe (t,ThreadId))
            -> t
            -> IO ()
timerThread ioT diffT alert mx st tt =
    waitUntil ioT diffT tt >>= \ tf ->
    myThreadId >>= \ i ->
    takeMVar mx  >>
    readRef st >>= \ s0 ->
    if isTimerThread i s0
        then writeRef st Nothing >>
             putMVar mx () >>
             alert tf
        else putMVar mx ()
    where isTimerThread _ Nothing = False
          isTimerThread i (Just (_,ix)) = (i == ix)

-- wait until a certain time is reached or breached. return time.
waitUntil :: (Ord t)
          => IO t
          -> DT2US t
          -> t 
          -> IO t
waitUntil ioT diffT tTarget =
    ioT >>= \ tNow ->
    if (tNow < tTarget)
        then threadDelay (d0 + diffT tTarget tNow) >>= \ _ -> 
             waitUntil ioT diffT tTarget
        else return tNow
    where d0 = 50 -- to avoid near-zero delays

-----------------------------------------------------------
-- Registrations with Clock
--   The purpose of registrations is to track activity and
--   prevent logical time from advancing too far past the 
--   worst straggler. When an active vat updates an inactive
--   vat, the inactive vat will immediately be registered 
--   as a potential straggler to ensure it processes those
--   updates. In some cases, this could allow a vat to be
--   registered multiple times, so each vat will clear
--   unnecessary registrations. 
--
--   We need to know when dropping a registration also 
--   increases the registryTime. When that happens, we
--   can wake up sleeping vats. 
----------------------------------------------------------- 
type Reg t uid = S.Set (t,uid)

emptyReg :: (Ord t, Ord uid) => Reg t uid
emptyReg = S.empty

-- find the worst straggler time
registryTime :: (Ord t, Ord uid) => Reg t uid -> Maybe t
registryTime rg = if(S.null rg) 
                    then Nothing 
                    else Just (fst (S.findMin rg))

-- find the worst straggler time, ignoring a particular UID
registryTimeX :: (Ord t, Ord uid) => uid -> Reg t uid -> Maybe t
registryTimeX ix rg =
    if(S.null rg) then Nothing
    else let ((tMin,ixMin),rg') = S.deleteFindMin rg
          in if(ix == ixMin) then registryTimeX ix rg'
                             else Just tMin

-- add an activity
addReg :: (Ord t, Ord uid) => uid -> t -> Reg t uid -> Reg t uid
addReg ix tm = ix `seq` tm `seq` S.insert (tm,ix)

-- remove an activity.
delReg :: (Ord t, Ord uid) => uid -> t -> Reg t uid -> Reg t uid
delReg ix t = S.delete (t,ix)

-- remove list of activities
delRegList :: (Ord t, Ord uid) => uid -> [t] -> Reg t uid -> Reg t uid
delRegList ix ts reg = foldl (flip $ delReg ix) reg ts

-- update: add an activity while removing older list. The added 
-- activity will be registered even if it overlaps a removed element
updReg :: (Ord t, Ord uid) => uid -> t -> [t] -> Reg t uid -> Reg t uid
updReg ix tAdd tsDel r = addReg ix tAdd (delRegList ix tsDel r)

-----------------------------------------------------------
-- Sleepers -
--   A set of unit MVars to signal at given times (according
--   to the logical clock). 
------------------------------------------------------------
type QSleep t = M.Map t [MVar ()]

emptyQSleep :: (Ord t) => QSleep t
emptyQSleep = M.empty

sleepersTime :: (Ord t) => QSleep t -> Maybe t
sleepersTime qs = if(M.null qs) 
                    then Nothing 
                    else Just (fst (M.findMin qs))

-- add a sleeper, sorted in time. 
gotoSleep :: (Ord t) => t -> MVar () -> QSleep t -> QSleep t
gotoSleep tm e = M.alter pushVar tm
    where pushVar Nothing   = Just (e:[])
          pushVar (Just xs) = Just (e:xs)

-- atomically take a subset of sleepers through requested time.
-- wake them using tryPutMVar, from earliest time to latest
wakeupSleepers :: (Ord t) => Ref (QSleep t) -> t -> IO ()
wakeupSleepers qref tm = 
    modifyRef' qref split >>= \ (l,m) ->
    mapM_ wakeL (M.elems l) >>
    maybe (return ()) wakeL m
    where split q = let (l,m,r) = M.splitLookup tm q
                     in (r, (l, m))
          wake e = tryPutMVar e ()
          wakeL  = mapM_ wake
*/



// PORT TODO: Port BehADT.lhs, below.
/*

{-# LANGUAGE GADTs, TypeOperators, Rank2Types #-}

module RDP.Behavior 
    ( S (..), OpMeta(..)
    , B (..)
    , BD (..), bdfst, bdsnd, bdonl, bdonr
    , BMapFn, BMapMFn
    , BFoldLFn, BFoldMLFn, BFoldMapLFn, BFoldMapMLFn
    , BFoldRFn, BFoldMRFn, BFoldMapRFn, BFoldMapMRFn
    , bmap, bmapm
    , bfoldmapl, bfoldmapml, bfoldl, bfoldml
    , bfoldmapr, bfoldmapmr, bfoldr, bfoldmr
    , QA(..), QL(..), QR(..), getA, getQ
    , bsimplify
    ) where

import Data.AffineSpace 
import Data.AdditiveGroup
import Control.Monad.Identity
import RDP.RDSignal
import RDP.RDBehavior ((:&:),(:|:))

-- Function types used in folds over maps.
type BMapFn a a' x y = a x y -> a' x y
type BMapMFn a a' m x y = a x y -> m (a' x y)
type BFoldLFn u t l a x y = BD u t l x -> a x y -> BD u t l y
type BFoldRFn u t l a x y = a x y -> BD u t l y -> BD u t l x
type BFoldMLFn u t l a m x y = BD u t l x -> a x y -> m (BD u t l y)
type BFoldMRFn u t l a m x y = a x y -> BD u t l y -> m (BD u t l x)
type BFoldMapLFn u t l a a' x y = BD u t l x -> a x y -> (a' x y, BD u t l y)
type BFoldMapRFn u t l a a' x y = a x y -> BD u t l y -> (BD u t l x, a' x y)
type BFoldMapMLFn u t l a a' m x y = BD u t l x -> a x y -> m (a' x y, BD u t l y)
type BFoldMapMRFn u t l a a' m x y = a x y -> BD u t l y -> m (BD u t l x, a' x y)

-- | some extra metadata to help with simplification
-- (so far just stuff from BLMeta)
data OpMeta = OpMeta
    { op_show :: String -- ^ string for debugging
    , op_query :: Bool  -- ^ behavior is query, or otherwise safe to drop 
    , op_tsen :: Bool   -- ^ behavior is time-sensitive, unsafe to time-shift
    }

-- | Signal operations. 
-- Type `u` is a universal unit signal, and `t` is associated time.
-- Type `a` is for effects, eval, exec, and other extensions.
data S u t a x y where 
    -- Effects, Eval, Exec, Extensions, etc.
    Sop     :: OpMeta -> a x y -> S u t a x y

    -- Value Manipulations. 
    -- Sfmap comes with an extra string for `show`.
    Sfmap   :: (SigFun f s t) => String -> f x y -> S u t a (s x) (s y)
    Sdrop   :: (SigShadow u s t, SigShadow s u t) => S u t a x (s ())
    Sconv   :: (SigShadow s' u t, SigLift s s' t) => S u t a (s x) (s' x)

    -- Value Composition (that requires touching signals)
    Sdup    :: S u t a x (x :&: x)
    Smerge  :: S u t a (x :|: x) x
    Sdisj   :: S u t a (x :&: (y :|: z)) ((x :&: y) :|: (x :&: z))
    Sconj   :: S u t a ((x :&: y) :|: (x :&: z)) (x :&: (y :|: z))
    Szip    :: (Signal s t) => S u t a (s x :&: s y) (s (x,y))
    Ssplit  :: (SigSplit s t) => S u t a (s (Either x y)) (s x :|: s y)

    -- Temporal Manipulations
    Sdelay  :: (SigTime t) => Diff t -> S u t a x x
    Ssynch  :: S u t a x x 
    Speek   :: (SigPeek s t) => Diff t -> S u t a (s x) (s () :|: s x)
        -- merge, zip, disjoin, and conjoin implicitly synch

-- NOTE:
-- Eval and Exec are handled as special operations (Sop)
-- to avoid direct dependency of S on B.
--   eval :: b x y -> ((s (b x y) :&: x) ~> y)
--   exec :: (s (b x y) :&: x) ~> s ()

-- | Data-plumbing behaviors
-- 'a' is the data processing and effect type
-- typically, a = S t a2 for some agent type a2
--
-- A minimal set is chosen, at expense of extra complexity in the
-- simplification code.
data B a x y where
    -- Effects, Signal Transforms, Delays, Annotations, Etc. 
    Bop   :: a x y -> B a x y

    -- Category (Sequential Composition)
    Bfwd  :: B a x x
    Bseq  :: B a x y -> B a y z -> B a x z

    -- Product (Parallel Composition)
    Bofst :: B a x x' -> B a (x :&: y) (x' :&: y)
    Bfst  :: B a (x :&: y) x
    Bswap :: B a (x :&: y) (y :&: x)
    Bapl  :: B a (x :&: (y :&: z)) ((x :&: y) :&: z)

    -- Sum (Conditional Composition)
    Bolft :: B a x x' -> B a (x :|: y) (x' :|: y)
    Binl  :: B a x (x :|: y)
    Bmirr :: B a (x :|: y) (y :|: x)
    Basl  :: B a (x :|: (y :|: z)) ((x :|: y) :|: z)

-- | data about boundaries between behaviors (RDP specific)
-- Propagates shadow signals through the model:
--   SigShadow s u t is necessary for `bdrop` 
--   SigShadow u s t is necessary for `bdisjoin` mask
data BD u t l x where
    BDSig  :: (SigShadow s u t, SigShadow u s t) => l s a -> BD u t l (s a)
    BDProd :: BD u t l x -> BD u t l y -> BD u t l (x :&: y)
    BDSum  :: BD u t l x -> BD u t l y -> BD u t l (x :|: y)
    BDNull :: BD u t l x  -- for dead code due to inl, inr, fst, snd 

-- | accessors
bdfst :: BD u t l (x :&: y) -> BD u t l x
bdsnd :: BD u t l (x :&: y) -> BD u t l y
bdonl :: BD u t l (x :|: y) -> BD u t l x
bdonr :: BD u t l (x :|: y) -> BD u t l y

bdfst (BDProd x _) = x
bdfst _ = BDNull

bdsnd (BDProd _ y) = y
bdsnd _ = BDNull

bdonl (BDSum x _) = x
bdonl _ = BDNull

bdonr (BDSum _ y) = y
bdonr _ = BDNull

-- types to annotate behaviors
newtype QL u t l x y = QL { unQL :: BD u t l x }
newtype QR u t r x y = QR { unQR :: BD u t r y }

-- for accumulating annotations
newtype QA q a x y = QA { unQA :: (q x y, a x y) }
getQ :: QA q a x y -> q x y
getQ = fst . unQA
getA :: QA q a x y -> a x y
getA = snd . unQA

----------------------------
-- BEHAVIOR FOLD MAP LEFT --
----------------------------

-- | Map a function and generate a value, with effects:
-- from left to right, first to second, inputs to outputs.
--
-- This function can expand the behavior graph, cannot shrink it.
bfoldmapml :: (Monad m) 
           => (forall d r . BFoldMapMLFn u t l a (B a') m d r)
           -> BFoldMapMLFn u t l (B a) (B a') m x y
-- for Extension
bfoldmapml af x (Bop a) = af x a

-- for Category
bfoldmapml _ x Bfwd = return (Bfwd,x)
bfoldmapml af x (Bseq f g) =
    bfoldmapml af x f >>= \ (f',y) ->
    bfoldmapml af y g >>= \ (g',z) ->
    return (Bseq f' g', z)

-- for Product
bfoldmapml af xy (Bofst f) =
    bfoldmapml af (bdfst xy) f >>= \ (f',x') ->
    return (Bofst f', BDProd x' (bdsnd xy))
bfoldmapml _ xy Bfst  = return (Bfst, bdfst xy)
bfoldmapml _ xy Bswap = return (Bswap, BDProd (bdsnd xy) (bdfst xy))
bfoldmapml _ xyz Bapl = return (Bapl, BDProd (BDProd x y) z)
    where x  = bdfst xyz
          yz = bdsnd xyz
          y  = bdfst yz
          z  = bdsnd yz

-- for Sum
bfoldmapml af xy (Bolft f) =
    bfoldmapml af (bdonl xy) f >>= \ (f',x') ->
    return (Bolft f', BDSum x' (bdonr xy))
bfoldmapml _ x Binl = return (Binl, BDSum x BDNull)
bfoldmapml _ xy Bmirr = return (Bmirr, BDSum (bdonr xy) (bdonl xy))
bfoldmapml _ xyz Basl = return (Basl, BDSum (BDSum x y) z)
    where x  = bdonl xyz
          yz = bdonr xyz
          y  = bdonl yz
          z  = bdonr yz 

-----------------------------
-- BEHAVIOR FOLD MAP RIGHT --
-----------------------------

-- | Map a function and generate a value, with effects:
-- from right to left, second to first, outputs to inputs
--
-- This function expands the behavior graph, cannot shrink it.
bfoldmapmr :: (Monad m)
           => (forall d r . BFoldMapMRFn u t l a (B a') m d r)
           -> BFoldMapMRFn u t l (B a) (B a') m x y
-- for Extension
bfoldmapmr af (Bop a) y = af a y

-- for Category
bfoldmapmr _ Bfwd x = return (x,Bfwd)
bfoldmapmr af (Bseq f g) z =
    bfoldmapmr af g z >>= \ (y,g') ->
    bfoldmapmr af f y >>= \ (x,f') ->
    return (x, Bseq f' g')

-- for Product
bfoldmapmr af (Bofst f) xy =
    bfoldmapmr af f (bdfst xy) >>= \ (x',f') ->
    return (BDProd x' (bdsnd xy), Bofst f')
bfoldmapmr _ Bfst x = return (BDProd x BDNull, Bfst)
bfoldmapmr _ Bswap yx = return (BDProd (bdsnd yx) (bdfst yx), Bswap)
bfoldmapmr _ Bapl xyz = return (BDProd x (BDProd y z), Bapl)
    where xy = bdfst xyz
          x  = bdfst xy
          y  = bdsnd xy
          z  = bdsnd xyz

-- for Sum
bfoldmapmr af (Bolft f) xy =
    bfoldmapmr af f (bdonl xy) >>= \ (x',f') ->
    return (BDSum x' (bdonr xy), Bolft f') 
bfoldmapmr _ Binl xy = return (bdonl xy, Binl)
bfoldmapmr _ Bmirr yx = return (BDSum (bdonr yx) (bdonl yx), Bmirr)
bfoldmapmr _ Basl xyz = return (BDSum x (BDSum y z), Basl)
    where xy = bdonl xyz
          x  = bdonl xy
          y  = bdonr xy
          z  = bdonr xyz

---------------------------------------------------------------
-- OTHER FOLD AND MAP OPERATIONS (DEFINED IN TERMS OF ABOVE) --
---------------------------------------------------------------

-- | map a transform across all domain elements in behavior
bmap :: (forall d r . BMapFn a (B a') d r) -> BMapFn (B a) (B a') x y
bmap af = runIdentity . bmapm (Identity . af)

-- | map a monadic transform across all domain elements of behavior
bmapm :: (Monad m) => (forall d r . BMapMFn a (B a') m d r)
      -> BMapMFn (B a) (B a') m x y
bmapm af b = bfoldmapml (bmapmf af) BDNull b >>= return . fst

bmapmf :: (Monad m) => BMapMFn a (B a') m d r 
       -> BFoldMapMLFn u t l a (B a') m d r
bmapmf af _ a = af a >>= \ b' -> return (b',BDNull)

-- wrap operation in identity monad
fnIdent :: (a -> b -> c) -> (a -> b -> Identity c)
fnIdent fn x y = Identity (fn x y)

-- | map a function and generate a value, from inputs to outputs
bfoldmapl  :: (forall d r . BFoldMapLFn u t l a (B a') d r)
           -> BFoldMapLFn u t l (B a) (B a') x y
bfoldmapl af x0 b = runIdentity $ bfoldmapml (fnIdent af) x0 b

-- | map a function and generate a value, from outputs to inputs
bfoldmapr  :: (forall d r . BFoldMapRFn u t l a (B a') d r)
           -> BFoldMapRFn u t l (B a) (B a') x y
bfoldmapr af b y0 = runIdentity $ bfoldmapmr (fnIdent af) b y0

-- | generate a value from the left
bfoldl  :: (forall d r . BFoldLFn u t l a d r) -> BFoldLFn u t l (B a) x y
bfoldl af x0 b = snd $ bfoldmapl (bfoldlf af) x0 b 

bfoldlf :: BFoldLFn u t l a d r -> BFoldMapLFn u t l a (B a) d r
bfoldlf af x a = (Bop a, af x a)

-- | generate a value from the left (with effects)
bfoldml :: (Monad m) => (forall d r . BFoldMLFn u t l a m d r) 
        -> BFoldMLFn u t l (B a) m x y
bfoldml af x0 b = bfoldmapml (bfoldmlf af) x0 b >>= return . snd

bfoldmlf :: (Monad m) => BFoldMLFn u t l a m d r 
         -> BFoldMapMLFn u t l a (B a) m d r
bfoldmlf af x a = af x a >>= \ y -> return (Bop a, y)

-- | generate a value from the right
bfoldr  :: (forall d r . BFoldRFn u t l a d r) -> BFoldRFn u t l (B a) x y
bfoldr af b y0 = fst $ bfoldmapr (bfoldrf af) b y0

bfoldrf :: BFoldRFn u t l a d r -> BFoldMapRFn u t l a (B a) d r
bfoldrf af a y = (af a y, Bop a)

-- | generate a value from the right (with effects)
bfoldmr :: (Monad m) => (forall d r . BFoldMRFn u t l a m d r)
        -> BFoldMRFn u t l (B a) m x y
bfoldmr af b y0 = bfoldmapmr (bfoldmrf af) b y0 >>= return . fst

bfoldmrf :: (Monad m) => BFoldMRFn u t l a m d r 
         -> BFoldMapMRFn u t l a (B a) m d r
bfoldmrf af a y = af a y >>= \ x -> return (x, Bop a)

---------------------------
-- Simplifying Behaviors --
---------------------------

-- Listify a sequence. E.g. (f >>> (g >>> h)) >>> ((i >>> j) >>> k)
-- reduces to (f >>> (g >>> (h >>> (i >>> (j >>> k))))))
bseqlist :: B a x y -> B a y z -> B a x z
bseqlist (Bseq f g) h = bseqlist f (Bseq g h)
bseqlist f (Bseq g h) = f `Bseq` bseqlist g h
bseqlist f g = f `Bseq` g 

-- simple list reductions. Assume `r` is simplified, i.e. simplify
-- starting from right hand side. Shifting of `drop` to left and
-- `delay` sufficient only to optimize across them.
bsimplseq :: B (S u t a) x y -> B (S u t a) x y
bsimplseq (Bseq Bfwd r) = r         -- NOP in sequence
bsimplseq (Bseq (Bofst Bfwd) r) = r -- NOP on first element
bsimplseq (Bseq (Bolft Bfwd) r) = r -- NOP on left element.
    -- combine sequential actions on first element.
bsimplseq (Bseq (Bofst f) (Bseq (Bofst f') r)) =
    (Bseq (Bofst (Bseq f f')) r)
bsimplseq (Bseq (Bofst f) (Bseq Bswap 
          (Bseq (Bofst g) (Bseq Bswap
          (Bseq (Bofst f') r))))) = 
    (Bseq Bswap (Bseq (Bofst g)
    (Bseq Bswap (Bseq (Bofst (Bseq f f')) r))))
    -- combine sequential actions on left element
bsimplseq (Bseq (Bolft f) (Bseq (Bolft f') r)) =
    (Bolft (Bseq f f') `Bseq` r)
bsimplseq (Bseq (Bolft f) (Bseq Bmirr
          (Bseq (Bolft g) (Bseq Bmirr
          (Bseq (Bolft f') r))))) = 
    (Bseq Bmirr (Bseq (Bolft g)
    (Bseq Bmirr (Bseq (Bolft (Bseq f f')) r))))
    -- basic reversible behaviors
bsimplseq (Bseq Bswap (Bseq Bswap r)) = r -- swap/swap
bsimplseq (Bseq Bmirr (Bseq Bmirr r)) = r -- mirror/mirror
bsimplseq (Bseq (Bop Sconj) (Bseq (Bop Sdisj) r)) = r -- conjoin/disjoin
bsimplseq (Bseq (Bop Sdisj) (Bseq (Bop Sconj) r)) = r -- disjoin/conjoin
    -- assoc-left and assoc-right, via swap3 or mirror3 
bsimplseq (Bseq (Bofst Bswap) (Bseq Bswap (Bseq Bapl
          (Bseq (Bofst Bswap) (Bseq Bswap (Bseq Bapl r)))))) = r
bsimplseq (Bseq Bapl (Bseq (Bofst Bswap) (Bseq Bswap
          (Bseq Bapl (Bseq (Bofst Bswap) (Bseq Bswap r)))))) = r
bsimplseq (Bseq (Bolft Bmirr) (Bseq Bmirr (Bseq Basl
          (Bseq (Bolft Bmirr) (Bseq Bmirr (Bseq Basl r)))))) = r
bsimplseq (Bseq Basl (Bseq (Bolft Bmirr) (Bseq Bmirr
          (Bseq Basl (Bseq (Bolft Bmirr) (Bseq Bmirr r)))))) = r
    -- time-shifts and time merges
bsimplseq (Bseq (Bop Ssynch) (Bseq (Bop Ssynch) r)) = 
    (Bseq (Bop Ssynch) r)
bsimplseq (Bseq (Bop (Sdelay d0)) (Bseq (Bop (Sdelay d1)) r)) =
    (Bseq (Bop (Sdelay (d0 ^+^ d1))) r)
bsimplseq b@(Bseq (Bop (Sdelay dt)) (Bseq f r)) =
    if bshiftable f 
        then (Bseq f (bsimplseq (Bseq (Bop (Sdelay dt)) r)))
        else b
    -- distribute drop across a product or sum.
bsimplseq (Bseq (Bofst f) (Bseq d@(Bop Sdrop) r)) =
    let f' = (Bseq f (dupdrop d)) in
    (Bseq (Bofst f') (Bseq (Bop Sdrop) r))
bsimplseq (Bseq (Bofst f) (Bseq Bswap
          (Bseq (Bofst g) (Bseq d@(Bop Sdrop) r)))) =
    let f' = (Bseq f (dupdrop d)) in
    (Bseq (Bofst f') (Bseq Bswap
    (Bseq (Bofst g) (Bseq (Bop Sdrop) r))))
bsimplseq (Bseq (Bolft f) (Bseq d@(Bop Sdrop) r)) =
    let f' = (Bseq f (dupdrop d)) in
    (Bseq (Bolft f') (Bseq (Bop Sdrop) r))
bsimplseq (Bseq (Bolft f) (Bseq Bmirr 
          (Bseq (Bolft g) (Bseq d@(Bop Sdrop) r)))) =
    let f' = (Bseq f (dupdrop d)) in
    (Bseq (Bolft f') (Bseq Bmirr
    (Bseq (Bolft g) (Bseq (Bop Sdrop) r))))
    -- distribute drop across merge
bsimplseq (Bseq (Bop Smerge) (Bseq d@(Bop Sdrop) r)) =
    (Bseq (Bolft (dupdrop d)) (Bseq Bmirr
    (Bseq (Bolft (dupdrop d)) (Bseq Bmirr
    (Bseq (Bop Smerge) (Bseq (Bop Sdrop) r))))))
    -- eliminate other droppable elements
bsimplseq b@(Bseq f (Bseq (Bop Sdrop) r)) =
    if bdroppable f 
        then (Bseq (Bop Sdrop) r) 
        else b
    -- none of the above? call it simplified.
bsimplseq b = b

-- dupdrop eliminates ambiguity in signal output type of the drop.
dupdrop :: B (S u t a) x (s ()) -> B (S u t a) x' (s ())
dupdrop (Bop Sdrop) = Bop Sdrop
dupdrop _ = error "illegal dupdrop"


-- Shiftable means delay can be shifted to after this action. This
-- is a conservative estimate, supports other simplifications. Does
-- not split, dup, merge, or zip delays.
--
-- Droppable means that the behavior can be dropped if its output is
-- dropped. This is simplistic dead-code elimination. 
bshiftable, bdroppable :: B (S u t a) x y -> Bool
sshiftable, sdroppable :: S u t a x y -> Bool

bshiftable (Bop s) = sshiftable s
bshiftable Bfwd = True
bshiftable Bfst = True
bshiftable Bswap = True
bshiftable Bapl = True
bshiftable Binl = True
bshiftable Bmirr = True
bshiftable Basl = True
bshiftable _ = False

bdroppable (Bop s) = sdroppable s
bdroppable Bfwd = True
bdroppable Bswap = True
bdroppable Bapl = True
bdroppable Binl = True
bdroppable Bmirr = True
bdroppable Basl = True
bdroppable _ = False

sshiftable (Sop m _) = not $ op_tsen m
sshiftable (Sfmap _ _) = True
sshiftable Sconv = True
sshiftable Sdrop = True
sshiftable Smerge = True
sshiftable Sdisj = True
sshiftable Sconj = True
sshiftable Szip = True
sshiftable Ssynch = True
sshiftable _ = False

sdroppable (Sop m _) = op_query m
sdroppable (Sfmap _ _) = True
sdroppable Sconv = True
sdroppable Sdrop = True
sdroppable Sdup = True
sdroppable Sdisj = True
sdroppable Sconj = True
sdroppable Szip = True
sdroppable Ssplit = True
sdroppable (Speek _) = True
sdroppable Ssynch = True
sdroppable _ = False

-- simplify sequences from right to left.
bsimplify' :: B (S u t a) x y -> B (S u t a) x y
bsimplify' (Bseq f g) = bsimplseq (Bseq f (bsimplify' g))
bsimplify' f = f

-- simplify sub-sequences and remove final `Bfwd`
bsimplsub :: B (S u t a) x y -> B (S u t a) x y
bsimplsub (Bseq f Bfwd) = bsimplsub f
bsimplsub (Bseq f g) = Bseq (bsimplsub f) (bsimplsub g)
bsimplsub (Bofst f) = Bofst (bsimplify f)
bsimplsub (Bolft f) = Bolft (bsimplify f)
bsimplsub f = f

-- | bsimplify is peephole simplification of a behavior.
bsimplify :: B (S u t a) x y -> B (S u t a) x y
bsimplify = bsimplsub . bsimplify' . flip bseqlist Bfwd
*/


/*

PORT TODO: Port the following files:

RDPIO/Time.lhs
RDPIO/Host.lhs
RDPIO/State.lhs
RDPIO/Loop.lhs
RDPIO/Run.lhs
Unique.lhs
RDPIO/Vat.lhs (header says VatMain)
RDPIO/VatCB.lhs
RDPIO/VatVar.lhs
RDPIO/LinkBase.lhs
RDPIO/Link.lhs
RDPIO/RDBehavior.lhs
RDPIO/RDBehaviorDyn.lhs
RDPIO/RDLink.lhs
RDPIO.lhs
DiscreteTimedSeq.lhs (header says DiscreteTimedSignal)
SigDSeq.lhs
SigD.lhs
SigC.lhs
Agent.lhs (RDAgent)
BError.lhs
BState.lhs (Trans.StateBehavior)
BWriter.lhs (Trans.BWriter)
BReader.lhs
*/
