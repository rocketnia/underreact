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
// PORT NOTE: We represent IO with asynchronous JavaScript procedures.
// Specifically, they're procedures that can be told to give up
// instead of doing anything asynchronous, so we should sometimes be
// able to use them in synchronous contexts.
// PORT NOTE: We represent Data.Time.Clock.UTCTime with a finite
// JavaScript number of milliseconds. Specifically, getCurrentTime
// is implemented as "new Date().getTime()".

// PORT TODO: Implement the following core Haskell functionality (or
// library functionality, as the case may be):
//
// newChan readChan

// PORT TODO: Implement the following dependencies of RDPIO.lhs:
//
// Link.lhs
// RDPIO/*.lhs
// RDPIO.lhs itself
//
// PORT TODO: Figure out what to do next.

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

function Maybe_Nothing() {}
Maybe_Nothing.prototype.init = function () {
    return this;
};

function Maybe_Just() {}
Maybe_Just.prototype.init = function ( just ) {
    this.just = just;
    return this;
};

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

function sequenceDrop( ins_Monad, ms ) {
    if ( ms instanceof List_Nil )
        return ms;
    var m = ms.getCar(), rest = ms.getCdr();
    return ins_Monad.bind( m, function ( _ ) {
        return sequenceDrop( ins_Monad, rest );
    } );
}

function mapMDrop( ins_Monad, f ) {
    return function ( list ) {
        return sequenceDrop( ins_Monad, map( f )( list ) );
    };
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

var class_Ord = makeClass( {
    // (<)
    lt: null
    // PORT TODO: Should we include Haskell's other Ord operations in
    // here as well?
} );

var ins_jsNum_Ord = makeInstance( class_Ord, {
    lt: function ( a, b ) {
        return a < b;
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
        new Maybe_Just( su ), new Maybe_Nothing() );
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

// TODO: Finish Link.lhs.










/*

-- | Some meta-data to support composable optimizations.
data BLMeta = BLMeta
    { bl_query :: Bool   -- | pure query; dead code if response dropped
    , bl_tsen  :: Bool   -- | time-sensitive; don't shift across delay
    , bl_show  :: String -- | indicator of purpose, for show or debug
    }

blMetaDefault :: BLMeta
blMetaDefault = BLMeta 
    { bl_query = False
    , bl_tsen  = True 
    , bl_show  = "BLink"
    }


--------------------------------
-- Some convenience Operators --
--------------------------------

-- | simplified link-update. This uses the vat's time, plus an 
-- offset, to turn a provided signal into an update. The same
-- offset is used to determine stability. 
linkUpdate :: (Monad v, Signal s (Time v), HasClock v)
    => Diff (Time v)                   -- stability & time offset
    -> ((LinkUp (Time v) s r) -> v ()) -- main update cap
    -> s r -> v ()
linkUpdate dt luSend = op
  where dtf    = if (dt == zeroV) then id else (.+^ dt)  
        op sig = 
            getTime >>= \ tNow -> 
            let tm = dtf tNow
                su = s_future tm sig
                lu = LinkUp { lu_update = Just su
                            , lu_stable = Just tm  }
            in luSend lu
    

-- | A common pattern in reactive systems is to observe a variable
-- without influencing it. RDP favors demand driven behaviors, where
-- observation is a form of influence (i.e. whether the reference is
-- maintained or not), but can model simple reactive observation. In
-- order to support anticipation, an observable reference updates as
-- an RDP link. I call this a LinkRef.
--
-- A LinkRef must be active whenever there is at least one observer.
-- In most cases, developers will keep it active at all times after
-- construction, until application shutdown. When a resource will
-- always be observed, this won't hurt performance. If necessary,
-- developers can use a demand monitor to track observers precisely.
--
-- LinkRef must be regularly updated to clear histories and maintain
-- signal stability. Each LinkRef keeps a copy of its signal so far,
-- which it must mask per observer link (for duration coupling).
--
mkLinkRef :: (BLink v b u t, SigShadow s u t, SigShadow u s t)
          => String                    -- ^ debug string
          -> Diff t                    -- ^ extra history to keep
          -> v ((LinkUp t s x -> v ()) -- ^ to update the reference
               ,b (s ()) (s x)         -- ^ to share the reference
               )
mkLinkRef sDebug = mkLinkRefD sDebug ignoreSub
    where ignoreSub = const $ return ()

-- | mkLinkRefD offers developers a very coarse estimate of demand,
-- basically whether there are any subscribers or not, as a callback
-- event. This is imprecise, since it will report a subscriber even
-- when the subscriber does not currently need the response. Use of
-- a demand monitor is STRONGLY recommended if trying to optimize an
-- expensive resource, like network.
--
-- But in many cases this estimate is sufficient and convenient, and
-- the overhead of an extra demand monitor and signal analysis might
-- be difficult to justify. Use the event to start or stop polling
-- loops for mouse input, for example.
--
-- The event is simple: Bool -> Action, with the Bool indicating if
-- there is at least one subscriber.
--
-- Otherwise, mkLinkRefD behaves the same as mkLinkRef.
--
mkLinkRefD :: (BLink v b u t, SigShadow s u t, SigShadow u s t)
           => String                    -- ^ debug string
           -> (Bool -> v ())            -- ^ event indicating interest
           -> Diff t                    -- ^ extra history to keep
           -> v ((LinkUp t s x -> v ()) -- ^ to update the reference
                ,b (s ()) (s x)         -- ^ to share the reference
                )
mkLinkRefD sDebug onSub dtHist =
    newVar Nothing     >>= \ vSig ->
    newVar (1,M.empty) >>= \ vObs ->
    let onLU = lrefOnLU fdt onSub vSig vObs 
        onBL = lrefOnBL onSub vSig vObs
        blm  = BLMeta { bl_query = True, bl_tsen = True, bl_show = sDebug }
        st0  = (0,(s_never,Nothing)) 
    in
    mkBLink blm st0 onBL >>= \ bl ->
    return (onLU, bl)
    where fdt = if (dtHist == zeroV) then id else (.-^ dtHist)

-- SUMMARY OF LINKREF STATE:
--   vSig - Maybe (s x, Maybe t)
--     Nothing      - initial state only; awaiting first update
--     Just (sl,tl) - current state-signal and stability
--   vObs - (Integer, Map: Integer -> BLRec)
--     First integer is to label new subscribers.
--     Map simply stores subscribers.
--   BLRec - (Integer, (s (), Maybe t))
--     Integer identifies subscripion, or 0 for not subscribed.
--     With demand signal and last reported stability.
--
-- NOTES:
-- * It is important that subscribers update based on the pre-cut
--   state of the signal, after each signal update. This ensures
--   that 'lossiness' only occurs to new subscribers.
-- * In general, a subscriber will process an update immediately
--   after updating the subscription. (The exception is if the
--   LinkRef is still uninitialized.)
-- * Subscribe whenever we might be interested in future updates.
-- * Use s_term to decide when to unsubscribe.
type LRSigSt    t s x   = Maybe (s x, Maybe t)
type LRObsSt  v t s x   = (Integer, LRObsMap v t s x)
type LRBLSt     t s     = (Integer, (s (), Maybe t))
type LRBLRec  v t s x   = BLRec t v (LRBLSt t s) s x 
type LRObsMap v t s x   = M.Map Integer (LRBLRec v t s x)

-- receives a subscriber update.
lrefOnBL :: (Signal s t, Vat v, HasVar v)
    => (Bool -> v ())
    -> Var v (LRSigSt t s x)
    -> Var v (LRObsSt v t s x)
    -> LRBLRec v t s x
    -> LinkUp t s () 
    -> v ()
lrefOnBL onSub vSig vObs blr lu = 
    readVar (bl_state blr) >>= \ (ix,(s0,_)) ->
    readVar vSig >>= \ ls ->
    let sf = maybe s0 (su_apply s0) (lu_update lu)
        tf = lu_stable lu
    in
    case ls of
      Nothing ->
        -- uninitialized source. Do not cut the initial 
        -- history; wait for first update to LinkRef.
        sf `seq` writeVar (bl_state blr) (ix,(sf,tf)) >>
        lrefSubscribe onSub vObs blr
      Just (sl,tl) ->
        -- cut the demand history immediately, just as with a source
        -- update. Decide whether to subscribe or unsubscribe. Send
        -- an update based on sl and the new demand.
        let tx   = tmin tl tf 
            sfc  = maybe s_never (snd . s_sample sf) tx
            bdone = maybe True (s_term sfc) tx
            autoSubscribe = if bdone then lrefUnsubscribe else lrefSubscribe
            slm  = s_mask sl sf
            tu   = lu_time lu
            slu  = fmap (flip s_future slm) tu 
            lux  = LinkUp { lu_update = slu, lu_stable = tx }
        in
        -- update the BLRec state, and maybe subscribe.
        sfc `seq` writeVar (bl_state blr) (ix,(sfc,tf)) >>
        autoSubscribe onSub vObs blr >>
        bl_link blr lux

lrefOnLU :: (Signal s t, Vat v, HasVar v)
    => (t -> t)
    -> (Bool -> v ())
    -> Var v (LRSigSt t s x)
    -> Var v (LRObsSt v t s x)
    -> LinkUp t s x
    -> v ()
lrefOnLU cutHist onSub vSig vObs lu =
    -- first update the link's signal history to support future
    -- subscribers.
    readVar vSig >>= \ ls ->
    let tl  = lu_stable lu 
        sl0 = maybe s_never fst ls
        sl  = maybe sl0 (su_apply sl0) (lu_update lu)
        slc = maybe sl (snd . s_sample sl . cutHist) tl
    in 
    slc `seq` writeVar vSig (Just (slc,tl)) >>

    -- second, process each subscriber, and possibly unsubscribe.
    readVar vObs >>= \ (_,omap) ->
    forM_ (M.elems omap) $ \ blr ->
        readVar (bl_state blr) >>= \ (ix,(sd,td)) ->
        let tx    = tmin tl td
            sdc   = maybe s_never (snd . s_sample sd) tx
            bdone = maybe True (s_term sdc) tx 
            slm   = s_mask sl sd
            tu    = lu_time lu
            slu   = fmap (flip s_future slm) tu
            lux   = LinkUp { lu_update = slu, lu_stable = tx }
         in 
         sdc `seq` writeVar (bl_state blr) (ix,(sdc,td)) >>
         when bdone (lrefUnsubscribe onSub vObs blr) >>
         bl_link blr lux
    
    
lrefSubscribe,lrefUnsubscribe 
    :: (Signal s t, Vat v, HasVar v)
    => (Bool -> v ())
    -> Var v (LRObsSt v t s x)
    -> LRBLRec v t s x
    -> v ()
lrefSubscribe onSub vObs blr =
    readVar (bl_state blr) >>= \ (ix,sig) ->
    when (ix == 0) $
        readVar vObs >>= \ (iNxt,m) ->
        writeVar (bl_state blr) (iNxt,sig) >>
        let m'    = M.insert iNxt blr m 
            iNxt' = succ iNxt  
        in
        m' `seq` writeVar vObs (iNxt', m') >>
        when (M.null m) (eventually $ onSub True)

lrefUnsubscribe onSub vObs blr =
    readVar (bl_state blr) >>= \ (ix,sig) ->
    when (ix /= 0) $
        writeVar (bl_state blr) (0,sig) >>
        readVar vObs >>= \ (iNxt,m) ->
        let m' = M.delete ix m in
        m' `seq` writeVar vObs (iNxt,m') >>
        when (M.null m') (eventually $ onSub False)

tmin :: (Ord t) => Maybe t -> Maybe t -> Maybe t
tmin Nothing y = y
tmin x Nothing = x
tmin (Just x) (Just y) = Just (min x y)


\end{code}


*/