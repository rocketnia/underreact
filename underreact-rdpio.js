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


// Core functionality the port depends on

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

function Endo_Endo() {}
Endo_Endo.prototype.init = function ( appEndo ) {
    this.getAppEndo = function () { return appEndo; };
    return this;
};

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


// Signal.lhs

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



// Clock.lhs

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



// Var.lhs

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



// Behavior.lhs

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



// VatCB.lhs

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



// Link.lhs

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



// RDPIO/Queue.lhs

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



// RDPIO/CSched.lhs

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



// RDPIO/Ref.lhs

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



/*

TODO: Port the following files:

RDPIO/CSchedIO.lhs
BehADT.lhs (Behavior)
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



For future reference, here are the notes used to get this list:


Files sorted by name:

RDPIO/CSched.lhs
RDPIO/CSchedIO.lhs
  RDPIO.CSched
  RDPIO.Ref
RDPIO/Host.lhs
  RDPIO.Time
  RDPIO.CSched
  RDPIO.CSchedIO
  RDPIO.Ref
RDPIO/Link.lhs
  RDSignal
  Behavior (meaning BehADT.lhs)
  RDLink
  RDPIO.State
  RDPIO.LinkBase
  RDPIO.Vat
  RDPIO.VatVar
RDPIO/LinkBase.lhs
  RDPIO.State
  RDLink
  RDSignal
  Behavior (meaning BehADT.lhs)
RDPIO/Loop.lhs
  Clock
  RDPIO.Ref
  RDPIO.Queue
  RDPIO.CSched
  RDPIO.Host
  RDPIO.State
RDPIO/Queue.lhs
RDPIO/RDBehavior.lhs
  RDSignal
  RDBehavior (meaning Behavior.lhs)
  Behavior (meaning BehADT.lhs)
  RDPIO.State
  RDPIO.LinkBase
RDPIO/RDBehaviorDyn.lhs
  RDSignal
  RDBehavior (meaning BehADT.lhs)
  RDPIO.RDBehavior
RDPIO/RDLink.lhs
  RDLink
  RDSignal
  RDBehavior (meaning Behavior.lhs)
  Behavior (meaning BehADT.lhs)
  RDPIO.State
  RDPIO.Vat
  RDPIO.VatVar
  RDPIO.LinkBase
  RDPIO.Link
  RDPIO.RDBehavior
RDPIO/Ref.lhs
RDPIO/Run.lhs
  Clock
  RDPIO.State
  RDPIO.Ref
  RDPIO.Queue
  RDPIO.Host
  RDPIO.CSched
  RDPIO.Loop
RDPIO/State.lhs
  RDPIO.Host
  RDPIO.CSched
  RDPIO.Ref
  RDPIO.Queue
RDPIO/Time.lhs
  RDSignal
  Clock
RDPIO/Vat.lhs (header says VatMain)
  Vat
  Unique
  Clock
  RDPIO.Run
  RDPIO.Queue
  RDPIO.State
  RDPIO.Host
RDPIO/VatCB.lhs
  VatCB
  RDPIO.Vat
  RDPIO.Queue
  RDPIO.Ref
  RDPIO.State
RDPIO/VatVar.lhs
  Var
  RDPIO.Host
  RDPIO.State
Agent.lhs (RDAgent)
  RDSignal
  RDBehavior (but seems not to use it)
  RDLink (but seems not to use it)
BehADT.lhs (Behavior)
  RDSignal
  RDBehavior (meaning Behavior.lhs)
Behavior.lhs (header says RDBehavior)
  Signal
BError.lhs
BReader.lhs
  (implicitly depends on Behavior.lhs)
BState.lhs (Trans.StateBehavior)
BWriter.lhs (Trans.BWriter)
Clock.lhs
  RDSignal
DiscreteTimedSeq.lhs (header says DiscreteTimedSignal)
Link.lhs (header says RDLink)
  Vat
  Var
  Clock
  RDSignal
  RDBehavior (meaning Behavior.lhs)
RDPIO.lhs
  RDPIO.State
  RDPIO.Run
  RDPIO.Vat
  RDPIO.VatVar
  RDPIO.VatCB
  RDPIO.RDLink
  RDPIO.RDBehavior
  RDPIO.RDBehaviorDyn
  RDPIO.Time
  Vat
  Var
  VatCB
  Clock
  RDLink
  RDSignal
  RDBehavior (but seems not to use it)
SigC.lhs
  SigDSeq
  DiscreteTimedSeq
  SigD
  RDSignal
SigD.lhs
  SigDSeq
  DiscreteTimedSeq
  RDSignal
SigDSeq.lhs
  DiscreteTimedSeq
Signal.lhs (header says RDSignal)
Unique.lhs
Var.lhs
Vat.lhs
  Clock
  Var
VatCB.lhs
  Vat



Files organized so they have no forward references:

Signal.lhs (header says RDSignal)
Clock.lhs
  RDSignal
Var.lhs
Vat.lhs
  Clock
  Var
Behavior.lhs (header says RDBehavior)
  Signal
VatCB.lhs
  Vat
Link.lhs (header says RDLink)
  Vat
  Var
  Clock
  RDSignal
  RDBehavior (meaning Behavior.lhs)
RDPIO/Queue.lhs
RDPIO/CSched.lhs
RDPIO/Ref.lhs
RDPIO/CSchedIO.lhs
  RDPIO.CSched
  RDPIO.Ref
BehADT.lhs (Behavior)
  RDSignal
  RDBehavior (meaning Behavior.lhs)
RDPIO/Time.lhs
  RDSignal
  Clock
RDPIO/Host.lhs
  RDPIO.Time
  RDPIO.CSched
  RDPIO.CSchedIO
  RDPIO.Ref
RDPIO/State.lhs
  RDPIO.Host
  RDPIO.CSched
  RDPIO.Ref
  RDPIO.Queue
RDPIO/Loop.lhs
  Clock
  RDPIO.Ref
  RDPIO.Queue
  RDPIO.CSched
  RDPIO.Host
  RDPIO.State
RDPIO/Run.lhs
  Clock
  RDPIO.State
  RDPIO.Ref
  RDPIO.Queue
  RDPIO.Host
  RDPIO.CSched
  RDPIO.Loop
Unique.lhs
RDPIO/Vat.lhs (header says VatMain)
  Vat
  Unique
  Clock
  RDPIO.Run
  RDPIO.Queue
  RDPIO.State
  RDPIO.Host
RDPIO/VatCB.lhs
  VatCB
  RDPIO.Vat
  RDPIO.Queue
  RDPIO.Ref
  RDPIO.State
RDPIO/VatVar.lhs
  Var
  RDPIO.Host
  RDPIO.State
RDPIO/LinkBase.lhs
  RDPIO.State
  RDLink
  RDSignal
  Behavior (meaning BehADT.lhs)
RDPIO/Link.lhs
  RDSignal
  Behavior (meaning BehADT.lhs)
  RDLink
  RDPIO.State
  RDPIO.LinkBase
  RDPIO.Vat
  RDPIO.VatVar
RDPIO/RDBehavior.lhs
  RDSignal
  RDBehavior (meaning Behavior.lhs)
  Behavior (meaning BehADT.lhs)
  RDPIO.State
  RDPIO.LinkBase
RDPIO/RDBehaviorDyn.lhs
  RDSignal
  RDBehavior (meaning BehADT.lhs)
  RDPIO.RDBehavior
RDPIO/RDLink.lhs
  RDLink
  RDSignal
  RDBehavior (meaning Behavior.lhs)
  Behavior (meaning BehADT.lhs)
  RDPIO.State
  RDPIO.Vat
  RDPIO.VatVar
  RDPIO.LinkBase
  RDPIO.Link
  RDPIO.RDBehavior
RDPIO.lhs
  RDPIO.State
  RDPIO.Run
  RDPIO.Vat
  RDPIO.VatVar
  RDPIO.VatCB
  RDPIO.RDLink
  RDPIO.RDBehavior
  RDPIO.RDBehaviorDyn
  RDPIO.Time
  Vat
  Var
  VatCB
  Clock
  RDLink
  RDSignal
  RDBehavior (but seems not to use it)
DiscreteTimedSeq.lhs (header says DiscreteTimedSignal)
SigDSeq.lhs
  DiscreteTimedSeq
SigD.lhs
  SigDSeq
  DiscreteTimedSeq
  RDSignal
SigC.lhs
  SigDSeq
  DiscreteTimedSeq
  SigD
  RDSignal
Agent.lhs (RDAgent)
  RDSignal
  RDBehavior (but seems not to use it)
  RDLink (but seems not to use it)
BError.lhs
BState.lhs (Trans.StateBehavior)
BWriter.lhs (Trans.BWriter)
BReader.lhs
  (implicitly depends on Behavior.lhs)


*/
