"use strict";
var exportsOrig = (function () { "use strict";

var _ = (function () {
var exports = {};


// lathe.js

// Copyright (c) 2011 Ross Angle
//
//   Permission is hereby granted, free of charge, to any person
//   obtaining a copy of this software and associated documentation
//   files (the "Software"), to deal in the Software without
//   restriction, including without limitation the rights to use,
//   copy, modify, merge, publish, distribute, sublicense, and/or sell
//   copies of the Software, and to permit persons to whom the
//   Software is furnished to do so, subject to the following
//   conditions:
//
//   The above copyright notice and this permission notice shall be
//   included in all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
//   OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//   HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
//   WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
//   OTHER DEALINGS IN THE SOFTWARE.
//
// Permission to use this software is also granted under the
// Perl Foundation's Artistic License 2.0. You may use either license,
// at your option.

// TODO: Document the purpose of lathe.js.

// We currently follow a good portion of the Google JavaScript style
// guide at <http://google-styleguide.googlecode.com/svn/trunk/
// javascriptguide.xml> (Revision 2.20, checked on 16-May-2011), but
// with plenty of exceptions:
//
//   - We attach methods inside the constructor instead of using
//     prototypes.
//   - We don't go to any special effort to create closures in scopes
//     that only contain the variables they need.
//   - We use the this keyword outside of constructors and methods,
//     because it's necessary for our generic function-handling
//     utilites.
//   - We alias the lathe "namespace" as "my" and the global object as
//     "root".
//   - We have at least one (noted) impure toString() method.
//   - We stop lines at 70 characters rather than 80.
//   - We indent by four spaces rather than two.
//   - We put spaces inside of all brackets, except when they're
//     grouping parentheses.
//   - We put trailing spaces on empty lines to match the surrounding
//     indentation.
//   - We don't indent *anything* based on an increment that couldn't
//     be consistently converted to an integer number of tabs (but we
//     use spaces anyway).
//   - We freely put any && and || infix operator on the start of a
//     line rather than the end if it's inside an if condition.
//   - We use grouping parentheses to clarify &&'s precedence over ||
//     even when we don't have to.
//   - We prefer " to '.
//   - We don't use JSDoc comments, and they probably wouldn't make
//     sense or compile most of the time thanks to the frameworks this
//     code establishes and uses.

// NOTE: We accompany predicate dispatch utilities with a "TYPE:"
// comment indicating most of its interface in terms of a type
// notation.
//
// a * b * c -s> d   -- A synchronous procedure with side effects.
// a * b * c -> d    -- A synchronous pure function.
// a * b * c -k> d   -- A synchronous, constant-time pure function.
// a *? b *... c -whatev> b  -- Optional and rest args.
// () -whatev> b     -- No args.
// L> a
//    -- A procedure of type (() -k> a), but which is allowed to be
//    -- impure while the application is still initializing. This
//    -- accomplishes late binding.
// [ element ]       -- An Array.
// k[ element ]
//    -- An Array which doesn't change in size or content except when
//    -- the application is still initializing.
// Win win           -- A DubiousResult_ instance, any fail allowed.
// a * b * c -r> d   -- Short for (a * b * c -k> Win d).
// a * b * c -rb> d  -- Short for k[ a * b * c -r> d ].
// 2              -- A truthy or falsy value (particularly a boolean).
// 0                 -- An ignored value (particularly, undefined).
// D                 -- Anything (dynamic).
// string            -- A string (typically primitive).
//
// These types are mostly a guideline, a documentation aid. For
// instance, these "pure" functions may look into data structures that
// are technically mutable, relying on the assumption that the data
// structures aren't actually mutated in any part of the program.

"use strict";

(function ( topThis, topArgs, body ) {
    
    // In Node.js, this whole file is semantically in a local context,
    // and certain plain variables exist that aren't on the global
    // object. Here, we get the global object in Node.js by taking
    // advantage of the fact that it doesn't implement ECMAScript 5's
    // strict mode.
    var root = (function () { return this; })() || topThis;
    // Actually, newer versions of Node don't expose the global object
    // that way either, and they probably don't put the whole file in
    // a local context.
    if ( !((root && typeof root === "object" && root[ "Object" ])
        || typeof GLOBAL === "undefined") )
        root = GLOBAL;
    
    // Here, we get the Node.js exports if they exist, and we splat
    // our exports on the global object if they don't.
    var my = topArgs !== void 0 && typeof exports !== "undefined" ?
        exports :
        ((root.rocketnia || (root.rocketnia = {})).lathe = {});
    
    body( root, my );
})( this, typeof arguments === "undefined" ? void 0 : arguments,
    function ( root, my ) {


var hasOwnProperty = {}.hasOwnProperty;
var objectProtoToString = {}.toString;
var slice = [].slice;
var Error = root[ "Error" ];
var functionProtoApply = (function () {}).apply;
var getPrototypeOf = root[ "Object" ][ "getPrototypeOf" ];
var floor = root[ "Math" ][ "floor" ];
var random = root[ "Math" ][ "random" ];
var pow = root[ "Math" ][ "pow" ];
var log = root[ "Math" ][ "log" ];
var ln2 = root[ "Math" ][ "LN2" ];
var Function = root[ "Function" ];
var setTimeout = root[ "setTimeout" ];
function toJson( x ) {
    return root[ "JSON" ][ "stringify" ]( x );
}
// TODO: See if
// "var fromCharCode = root[ "String" ][ "fromCharCode" ];" works.
function fromCharCode( x ) {
    return root[ "String" ][ "fromCharCode" ]( x );
}

// These are only available in the browser.
var document = root[ "document" ];
function write( x ) {
    return document[ "write" ]( x );
}
function createElement( x ) {
    return document[ "createElement" ]( x );
}
function createTextNode( x ) {
    return document[ "createTextNode" ]( x );
}
var document_addEventListener =
    document && document[ "addEventListener" ];
function getElementById( x ) {
    return document[ "getElementById" ]( x );
}

// These are only available in Node.js.
var process = root[ "process" ];
var nextTick = process && process[ "nextTick" ];


// ===== Platform sniffing. ==========================================

my.usingStrict = (function () { return this === void 0; })();


// ===== Value sniffing. =============================================

my.hasOwn = function ( self, property ) {
    return hasOwnProperty.call( self, property );
};

function classTester( clazz ) {
    var expected = "[object " + clazz + "]";
    return function ( x ) {
        return objectProtoToString.call( x ) === expected;
    };
}

// NOTE: These work even on things which have a typeof of "boolean",
// "number", or "string".
my.isBoolean = classTester( "Boolean" );
my.isNumber = classTester( "Number" );
my.isString = classTester( "String" );
my.isReallyArray = classTester( "Array" );
var isFunctionObject = classTester( "Function" );

// TODO: Improve the accuracy of this.
my.likeArguments = function ( x ) {
    return my.hasOwn( x, "callee" );
};

// TODO: Improve the accuracy of likeArguments().
my.likeArray = function ( x ) {
    return my.isReallyArray( x ) || my.likeArguments( x );
};

my.isFunction = function ( x ) {
    return typeof x === "function" || isFunctionObject( x );
};

my.given = function ( a ) { return a !== void 0; };

my.sameTwo = function ( a, b ) {
    // Two values in JavaScript are indistinguishable if they fit
    // these criteria. The === operator mostly suffices, with two
    // exceptions: It gives (-0 === 0) even though (1/-0 !== 1/0),
    // and it gives (NaN !== NaN).
    return (a === b && (a !== 0 || 1 / a === 1 / b)) ||
        (a !== a && b !== b);
};

if ( getPrototypeOf )
    my.likeObjectLiteral = function ( x ) {
        if ( x === null ||
            objectProtoToString.call( x ) !== "[object Object]" )
            return false;
        var p = getPrototypeOf( x );
        return p !== null && typeof p === "object" &&
            getPrototypeOf( p ) === null;
    };
else if ( {}.__proto__ !== void 0 )
    my.likeObjectLiteral = function ( x ) {
        if ( x === null ||
            objectProtoToString.call( x ) !== "[object Object]" )
            return false;
        var p = x.__proto__;
        return p !== null && typeof p === "object" &&
            p.__proto__ === null;
    };
else
    my.likeObjectLiteral = function ( x ) {
        return x !== null &&
            objectProtoToString.call( x ) === "[object Object]" &&
            x.constructor === {}.constructor;
    };


// ===== Sundries. ===================================================

// This takes any number of arguments and returns the first one (or
// undefined, if there are no arguments).
my.idfn = function ( result, var_args ) { return result; };

my.kfn = function ( result ) {
    return function ( var_args ) { return result; };
};

my.pluckfn = function ( prop ) {
    return function ( obj ) { return obj[ prop ]; };
};

my.arrCut = function ( self, opt_start, opt_end ) {
    // NOTE: In IE 8, passing slice a third argument of undefined is
    // different from passing it only two arguments.
    return my.given( opt_end ) ?
        slice.call( self, opt_start, opt_end ) :
        slice.call( self, opt_start );
};

my.arrUnbend = function ( args, opt_start ) {
    args = my.arrCut( args, opt_start );
    if ( args.length === 0 )
        throw new Error();
    return args.concat( my.arrCut( args.pop() ) );
};

my.funcApply = function ( self, func, var_args ) {
    return functionProtoApply.call(
        func, self, my.arrUnbend( arguments, 2 ) );
};

my.funcCall = function ( func, var_args ) {
    return my.funcApply( null, func, my.arrCut( arguments, 1 ) );
};

my.latefn = function ( getFunc ) {
    return function ( var_args ) {
        return my.funcApply(
            this, getFunc(), my.arrCut( arguments ) );
    };
};


// ===== Asynchronous calculations. ==================================

if ( nextTick !== void 0 )
    my.defer = function ( then ) {
        nextTick( function () {
            then();
        } );
    };
else
    my.defer = function ( then ) {
        setTimeout( function () {
            then();
        }, 0 );
    };

my.startPromise = function ( calculate ) {
    var finishedListeners = [];
    var promiseResult;
    calculate( function ( r ) {
        if ( finishedListeners === null )
            return;
        promiseResult = r;
        finishedListeners.forEach( function ( listener ) {
            my.defer( function () {
                listener( r );
            } );
        } );
        finishedListeners = null;
    } );
    var promise = {};
    promise.onceFinished = function ( then ) {
        if ( finishedListeners === null )
            my.defer( function () {
                then( promiseResult );
            } );
        else
            finishedListeners.push( then );
    };
    return promise;
};

my.makeMutex = function () {
    var unlockPromise = null;
    var unlockContinuation;
    var mutex = {};
    mutex.lock = function ( body, then ) {
        if ( unlockPromise === null ) {
            unlockPromise = my.startPromise( function ( then ) {
                unlockContinuation = then;
            } );
            body( function ( bodyResult ) {
                unlockContinuation( null );
                unlockPromise = unlockContinuation = null;
                then( bodyResult );
            } );
        } else {
            unlockPromise.onceFinished( function ( nil ) {
                mutex.lock( body, then );
            } );
        }
    };
    return mutex;
};

my.oncefn = function ( func ) {
    var done = false;
    return function ( var_args ) {
        if ( done ) return void 0;
        done = true;
        return my.funcApply( this, func, arguments );
    };
};


// ===== Primitive collection operations. ============================

my.numAny = function ( n, body ) {
    var result;
    for ( var i = 0; i < n; i++ )
        if ( result = body( i ) )
            return result;
    return false;
};

// TODO: Rename this to numEach.
my.repeat = function ( n, body ) {
    for ( var i = 0; i < n; i++ )
        body( i );
};

my.numMap = function ( num, func ) {
    return my.acc( function ( y ) {
        my.repeat( num, function ( i ) { y( func( i ) ); } );
    } );
};

my.acc = function ( body ) {
    var result = [];
    body( function ( it ) { result.push( it ); } );
    return result;
};

my.arrAny = function ( arr, check ) {
    return my.numAny( arr.length, function ( i ) {
        return check( arr[ i ], i );
    } );
};

my.arrAll = function ( arr, check ) {
    return !my.arrAny( arr, function ( it, i ) {
        return !check( it, i );
    } );
};

my.arrEach = function ( arr, body ) {
    my.arrAny( arr, function ( it, i ) {
        body( it, i );
        return false;
    } );
};

my.arrFoldl = function ( init, arr, func ) {
    var result = init;
    my.arrEach( arr, function ( it ) {
        result = func( result, it );
    } );
    return result;
};

my.arrKeep = function ( arr, check ) {
    return my.acc( function ( y ) {
        my.arrEach( arr, function ( it ) {
            if ( check( it ) )
                y( it );
        } );
    } );
};

my.arrRem = function ( arr, check ) {
    return my.arrKeep( arr, function ( it ) {
        return !check( it );
    } );
};

my.arrMap = function ( arr, convert ) {
    return my.acc( function ( y ) {
        my.arrEach( arr, function ( it, i ) {
            y( convert( it, i ) );
        } );
    } );
};

my.arrDownAny = function ( arr, check ) {
    for ( var i = arr.length - 1; 0 <= i; i-- ) {
        var result = check( arr[ i ], i );
        if ( result )
            return result;
    }
    return false;
};

my.arrDownEach = function ( arr, body ) {
    my.arrDownAny( arr, function ( it, i ) {
        body( it, i );
        return false;
    } );
};

my.arrFoldr = function ( arr, init, func ) {
    var result = init;
    my.arrDownEach( arr, function ( it ) {
        result = func( it, result );
    } );
    return result;
};

my.arrJoin = function ( arr ) {
    return my.acc( function ( y ) {
        my.arrEach( arr, function ( innerArr ) {
            my.arrEach( innerArr, function ( item ) {
                y( item );
            } );
        } );
    } );
};

my.arrPlus = function ( var_args ) {
    return my.arrJoin( arguments );
};

my.arrMappend = function ( arr, convert ) {
    return my.arrJoin( my.arrMap( arr, convert ) );
};

my.arrSetMinus = function ( eq, as, bs ) {
    return my.arrRem( as, function( a ) {
        return my.arrAny( bs, function ( b ) { return eq( a, b ); } );
    } );
};

my.arrSubset = function ( eq, as, bs ) {
    return my.arrAll( as, function( a ) {
        return my.arrAny( bs, function ( b ) { return eq( a, b ); } );
    } );
};

my.arrTuple = function ( size, arr ) {
    if ( arr.length % size !== 0 )
        throw new Error( "Can't arrTuple into uneven tuples." );
    return my.acc( function ( y ) {
        var thisTuple = [];
        my.arrEach( arr, function ( item ) {
            thisTuple.push( item );
            if ( thisTuple.length === size ) {
                y( thisTuple );
                thisTuple = [];
            }
        } );
    } );
    return result;
};

my.arrPair = function ( arr ) {
    return my.arrTuple( 2, arr );
};

function finishWithErrors( thro, ret, errors, var_args ) {
    if ( errors.length === 1 ) return void thro( errors[ 0 ] );
    if ( errors.length !== 0 ) return void thro( errors );
    my.funcApply( null, ret, my.arrCut( arguments, 3 ) );
}

my.arrMapConcurrent = function ( arr, asyncFunc, then ) {
    var n = arr.length;
    if ( n === 0 )
        return void my.defer( function () {
            then( [] );
        } );
    var results = [];
    results[ n - 1 ] = void 0;
    my.arrEach( arr, function ( item, i ) {
        my.defer( function () {
            asyncFunc( i, item, my.oncefn( function ( r ) {
                results[ i ] = r;
                n--;
                if ( n === 0 )
                    then( results );
            } ) );
        } );
    } );
};

my.arrEachConcurrentExn = function ( arr, asyncFunc, thro, ret ) {
    my.arrMapConcurrent( arr, function ( i, item, then ) {
        asyncFunc( i, item, function ( e ) {
            then( { success: false, val: e } );
        }, function () {
            then( { success: true } );
        } );
    }, function ( results ) {
        finishWithErrors( thro, ret, my.acc( function ( y ) {
            my.objOwnEach( results, function ( k, v ) {
                if ( !v.success ) y( v.val );
            } );
        } ) );
    } );
};

my.objOwnAny = function ( obj, func ) {
    // TODO: See what to do about the IE DontEnum bug, if anything.
    for ( var key in obj )
        if ( my.hasOwn( obj, key ) ) {
            var result = func( key, obj[ key ] );
            if ( result )
                return result;
        }
    return false;
};

my.objOwnAll = function ( obj, func ) {
    return !my.objOwnAny( obj, function ( k, v ) {
        return !func( k, v );
    } );
};

my.objOwnEach = function ( obj, func ) {
    return my.objOwnAny( obj, function ( k, v ) {
        func( k, v );
        return false;
    } );
};

my.objOwnKeys = function ( obj ) {
    return my.acc( function ( y ) {
        my.objOwnEach( obj, function ( k, v ) { y( k ); } );
    } );
};

function informalArgsToObj( args ) {
    var result = {};
    for ( var i = 0, n = args.length; i < n; ) {
        var arg = args[ i ];
        i++;
        var v = args[ i ];
        if ( my.isString( arg ) && i < args.length )
            i++, result[ arg ] = v;
        else if ( my.likeObjectLiteral( arg ) )
            my.objOwnEach( arg, function ( k, v ) {
                result[ k ] = v;
            } );
        else if ( my.likeArray( arg ) && i < args.length )
            i++, my.arrEach( arg, function ( k ) {
                result[ k ] = v;
            } );
        else
            throw new Error(
                "Unrecognized argument to informalArgsToObj()." );
    }
    return result;
}

my.objAcc = function ( body ) {
    var result = {};
    body( function ( var_args ) {
        my.objOwnEach( informalArgsToObj( arguments ),
            function ( k, v ) {
            
            result[ k ] = v;
        } );
    } );
    return result;
};

// TODO: Rename this to objOwnMap.
// NOTE: This passes ( v, k ), not ( k, v ).
my.objMap = function ( obj, func ) {
    return my.objAcc( function ( y ) {
        my.objOwnEach( obj, function ( k, v ) {
            y( k, func( v, k ) );
        } );
    } );
};

// TODO: Rename this to objOwnMappend.
// NOTE: This passes ( v, k ), not ( k, v ).
my.objMappend = function ( obj, func ) {
    return my.objAcc( function ( y ) {
        my.objOwnEach( obj, function ( k, v ) {
            y( func( v, k ) );
        } );
    } );
};

// NOTE: This passes ( v, k ), not ( k, v ).
my.objOwnKeep = function ( obj, func ) {
    return my.objAcc( function ( y ) {
        my.objOwnEach( obj, function ( k, v ) {
            if ( func( v, k ) )
                y( k, v );
        } );
    } );
};

// NOTE: This passes ( v, k ), not ( k, v ).
my.objOwnRem = function ( obj, func ) {
    return my.objOwnKeep( obj, function ( v, k ) {
        return !func( v, k );
    } );
};

// TODO: Rename this to objOwnCopy.
my.objCopy = function ( obj ) {
    return my.objOwnKeep( obj, my.kfn( true ) );
};

my.objOwnKeySetMinus = function ( fullObj, blacklistObj ) {
    return my.objOwnKeep( fullObj, function ( v, k ) {
        return !my.hasOwn( blacklistObj, k );
    } );
};

my.objOwnKeySetMask = function ( fullObj, whitelistObj ) {
    return my.objOwnKeep( fullObj, function ( v, k ) {
        return my.hasOwn( whitelistObj, k );
    } );
};

my.objOwnKeySetOr = function ( preferredObj, fallbackObj ) {
    var result = my.objCopy( preferredObj );
    my.objOwnEach( fallbackObj, function ( k, v ) {
        if ( !my.hasOwn( result, k ) )
            result[ k ] = v;
    } );
    return result;
};

my.objOwnEachConcurrent = function ( obj, asyncFunc, then ) {
    var n = 0;
    my.objOwnEach( obj, function ( k, v ) {
        n++;
        my.defer( function () {
            asyncFunc( k, v, my.oncefn( function () {
                n--;
                if ( n === 0 )
                    then();
            } ) );
        } );
    } );
    if ( n === 0 )
        return void my.defer( function () {
            then();
        } );
};

my.objOwnMapConcurrent = function ( obj, asyncFunc, then ) {
    var n = 0;
    var results = {};
    my.objOwnEach( obj, function ( k, v ) {
        n++;
        my.defer( function () {
            asyncFunc( k, v, my.oncefn( function ( r ) {
                results[ k ] = r;
                n--;
                if ( n === 0 )
                    then( results );
            } ) );
        } );
    } );
    if ( n === 0 )
        return void my.defer( function () {
            then( {} );
        } );
};

my.objOwnEachConcurrentExn = function ( obj, asyncFunc, thro, ret ) {
    my.objOwnMapConcurrent( obj, function ( k, v, then ) {
        asyncFunc( k, v, function ( e ) {
            then( { success: false, val: e } );
        }, function () {
            then( { success: true } );
        } );
    }, function ( results ) {
        finishWithErrors( thro, ret, my.acc( function ( y ) {
            my.objOwnEach( results, function ( k, v ) {
                if ( !v.success ) y( v.val );
            } );
        } ) );
    } );
};

my.objOwnMapConcurrentExn = function ( obj, asyncFunc, thro, ret ) {
    my.objOwnMapConcurrent( obj, function ( k, v, then ) {
        asyncFunc( k, v, function ( e ) {
            then( { success: false, val: e } );
        }, function ( r ) {
            then( { success: true, val: r } );
        } );
    }, function ( results ) {
        var errors = [];
        var successes = {};
        my.objOwnEach( results, function ( k, v ) {
            if ( v.success )
                successes[ k ] = v.val;
            else
                errors.push( v.val );
        } );
        finishWithErrors( thro, ret, errors, successes );
    } );
};

// NOTE: This returns false for my.jsonIso( 0, -0 ) and true for
// my.jsonIso( 0 / 0, 0 / 0 ). This treats arguments objects as
// Arrays.
my.jsonIso = function ( a, b ) {
    var pairsLeft = [ { a: a, b: b } ];
    while ( pairsLeft.length !== 0 ) {
        var pair = pairsLeft.shift();
        a = pair.a, b = pair.b;
        if ( my.likeArray( a ) ) {
            if ( !(my.likeArray( b ) && a.length === b.length) )
                return false;
            my.arrEach( a, function ( it, i ) {
                return pairsLeft.push( { a: it, b: b[ i ] } );
            } );
        } else if ( my.isString( a ) ) {
            if ( !(my.isString( b ) && "" + a === "" + b) )
                return false;
        } else if ( my.isNumber( a ) ) {
            if ( !(my.isNumber( b ) && my.sameTwo( 1 * a, 1 * b )) )
                return false;
        } else if ( my.isBoolean( a ) ) {
            if ( !(my.isBoolean( b ) && !a === !b) )
                return false;
        } else if ( a === null ) {
            if ( b !== null )
                return false;
        } else if ( my.likeObjectLiteral( a ) ) {
            if ( !(
                my.likeObjectLiteral( b )
                && my.objOwnAll( a, function ( k, v ) {
                    return my.hasOwn( b, k );
                } )
                && my.objOwnAll( b, function ( k, v ) {
                    return my.hasOwn( a, k );
                } )
            ) )
                return false;
            my.objOwnEach( a, function ( k, v ) {
                pairsLeft.push( { a: v, b: b[ k ] } );
            } );
        } else {
            throw new Error( "Invalid argument to jsonIso()." );
        }
    }
    return true;
};


// ===== Miscellaneous utilities. ====================================

my.alGet = function ( al, k ) {
    for ( var i = 0, n = al.length; i < n; i++ ) {
        var it = al[ i ];
        if ( my.sameTwo( it[ 0 ], k ) )
            return { val: it[ 1 ] };
    }
    return void 0;
};

my.alCons = function ( k, v, al ) {
    var result = [];
    my.arrEach( al, function ( it ) {
        if ( !my.sameTwo( it[ 0 ], k ) )
            result.unshift( it );
    } );
    result.unshift( [ k, v ] );
    return result;
};

my.noname = { toString: function () { return "(noname)"; } };

my.isName = function ( x ) {
    return x === my.noname || my.isString( x );
};

my.definer = function ( opt_obj, opt_name, func ) {
    var args = my.arrCut( arguments );
    var obj = my.isName( args[ 1 ] ) ? args.shift() : void 0;
    var name = my.isName( args[ 0 ] ) ? args.shift() : my.noname;
    var func = args[ 0 ];
    function result( opt_obj, opt_name, var_args ) {
        var args = my.arrCut( arguments );
        var obj = my.isName( args[ 1 ] ) ? args.shift() : void 0;
        var name = my.isName( args[ 0 ] ) ? args.shift() : my.noname;
        var result = my.funcApply( this, func, obj, name, args );
        if ( my.given( obj ) && my.isString( name ) )
            obj[ name ] = result;
        return result;
    }
    if ( my.given( obj ) && my.isString( name ) )
        obj[ name ] = result;
    return result;
};

// TODO: This is global state. Decide how to emphasize and manage this
// fact.
var gensymPrefix = "gs" +
    (floor( random() * 1e10 ) + 1e10 + "").substring( 1 ) + "n";
var gensymSuffix = 0;
my.gensym = function () { return gensymPrefix + gensymSuffix++; };


// This is inspired by Pauan's Object.create() at
// <http://kaescripts.blogspot.com/2009/04/
// essential-javascript-functions.html>, which is in turn copied and
// pasted from Douglas Crockford's Object.create() at
// <http://javascript.crockford.com/prototypal.html>.
//
my.shadow = function ( parent, opt_entries ) {
    function Shadower() {}
    Shadower.prototype = parent;
    
    var result = new Shadower();
    if ( my.given( opt_entries ) )
        my.objOwnEach( opt_entries, function ( k, v ) {
            result[ k ] = v;
        } );
    return result;
};


function Opt( bam ) {
    this.bam = bam;
}
Opt.prototype.or = function ( var_args ) {
    var args = informalArgsToObj( arguments );
    var oldBam = this.bam;
    return new Opt( function () {
        return my.objOwnKeySetOr( oldBam(), args );
    } );
};
Opt.prototype.orf = function ( var_args ) {
    var args = informalArgsToObj( arguments );
    var oldBam = this.bam;
    return new Opt( function () {
        var result = my.objCopy( oldBam() );
        my.objOwnEach( args, function ( k, v ) {
            if ( !my.hasOwn( result, k ) )
                result[ k ] = my.isFunction( v ) ? v() : v;
        } );
        return result;
    } );
};

my.opt = function ( opt_result ) {
    return new Opt(
        my.kfn( my.given( opt_result ) ? opt_result : {} ) );
};


// TODO: Make this more flexible.
my.copdate = function ( obj, key, update ) {
    if ( my.likeObjectLiteral( obj ) )
        obj = my.objCopy( obj );
    else if ( my.likeArray( obj ) )
        obj = my.arrCut( obj );
    else
        throw new Error( "Invalid obj argument to copdate()." );
    if ( !my.isFunction( update ) )
        update = my.kfn( update );
    obj[ key ] = update( obj[ key ] );
    return obj;
};

// Example usage:
//
// lathe.namedlet( 0, [], function ( len, acc, next ) { ... } )
//
my.namedlet = function () {
    var init = my.arrCut( arguments );
    var body = init.pop();
    function loop( var_args ) {
        var vals = my.arrCut( arguments );
        return my.funcApply( null, body, vals.concat( [ loop ] ) );
    }
    return loop.apply( null, init );
};


// ===== Debugging. ==================================================
// TODO: Remove this or scrutinize it.

my.blahlogs = {};

my.blahlogs.docPara = function ( opt_text ) {
    if ( !my.given( opt_text ) ) opt_text = "";
    opt_text = ("" + opt_text).replace( /\n/g, "<br />" );
    if ( opt_text.length === 0 ) opt_text = "&nbsp;";
    write( "<p class='blahlog'>" + opt_text + "</p>" );
    return opt_text;
};

my.blahlogs.elAppend = function ( id ) {
    return function ( opt_text ) {
        if ( !my.given( opt_text ) ) opt_text = "";
        var nodes = opt_text === "" ?
            [ createTextNode( "|" ) ] :
            my.arrCut( my.arrMappend( ("" + opt_text).split( /\n/g ),
                function ( line ) {
                    return [ createElement( "br" ),
                        createTextNode( line ) ];
                } ), 1 );
        var para = createElement( "p" );
        para.className = "blahlog";
        my.each(
            nodes, function ( node ) { para.appendChild( node ); } );
        my.el( id ).appendChild( para );
        return opt_text;
    };
};

// TODO: This is meant to be used as global state during debugging.
// Decide how to emphasize and manage this fact.
my.blahlog = my.blahlogs.docPara;

my.blah = my.definer( function ( obj, name, opt_body, opt_options ) {
    opt_options =
        my.opt( opt_options ).or( { skipBeginning: false } ).bam();
    if ( !my.given( opt_body ) )
        return my.blahlog( "|- " + name );
    if ( !opt_options.skipBeginning )
        my.blahlog( "/- " + name );
    try { var result = opt_body(); }
    catch ( e ) {
        my.blahlog( "\\* " + name + " " + e );
        throw e;
    }
    my.blahlog( "\\- " + name + " " + result );
    return result;
} );

my.blahfn = my.definer( function ( obj, name, func ) {
    if ( !my.given( name ) ) name = "" + func;
    return function ( var_args ) {
        var self = this, args = arguments;
        my.blahlog( "/= " + name + " " + args );
        return my.blah( name, function () {
            return my.funcApply( self, func, args );
        }, { skipBeginning: true } );
    };
} );


// ===== Self-organizing precedence system. ==========================

// TODO: Tag every rule with a timestamp and a lexical unit (e.g., a
// filename), and provide a batteries-included precedence rule that
// sorts based on those things.
//
// TODO: Implement lathe.defaultRule( ... ) or something, and provide
// a batteries-included precedence rule that sorts defaultRules last.

function TransitiveDag( elems ) {
    this.nodes = my.arrMap( elems, function ( elem ) {
        return { elem: elem, befores: [], afters: [] };
    } );
    this.getNode = function ( elem ) {
        var self = this;
        return my.arrAny( self.nodes, function ( node ) {
            return my.sameTwo( elem, node.elem ) ? node : false;
        } ) || null;
    };
    this.hasEdge = function ( before, after ) {
        var beforeNode = this.getNode( before );
        return beforeNode !== null && my.arrAny( beforeNode.afters,
            function ( it ) { return my.sameTwo( after, it ); } );
    };
    this.addEdge = function ( before, after, errorThunk ) {
        var self = this;
        var edgesToAdd = [ { before: before, after: after } ];
        while ( edgesToAdd.length !== 0 ) {
            var edge = edgesToAdd.shift();
            if ( this.hasEdge( edge.before, edge.after ) )
                continue;
            if ( this.hasEdge( edge.after, edge.before ) )
                errorThunk();
            var beforeNode = this.getNode( edge.before );
            var afterNode = this.getNode( edge.after );
            afterNode.befores.push( before );
            beforeNode.afters.push( after );
            my.arrEach( beforeNode.befores, function ( it ) {
                edgesToAdd.push( { before: it, after: after } );
            } );
            my.arrEach( afterNode.afters, function ( it ) {
                edgesToAdd.push( { before: before, after: it } );
            } );
        }
    };
    this.flatten = function () {
        var nodes = this.nodes;
        var result = [];
        function commit( elems ) {
            my.arrEach( elems,
                function ( elem ) { result.unshift( elem ); } );
            nodes = my.arrRem( nodes, function ( node ) {
                return my.arrAny( elems, function ( it ) {
                    return my.sameTwo( it, node.elem );
                } );
            } );
        }
        while ( nodes.length !== 0 ) {
            commit( my.arrMap(
                my.arrKeep( nodes, function ( node ) {
                     return my.arrSubset(
                         my.sameTwo, node.afters, result );
                } ),
                function ( it ) { return it.elem; }
            ) );
        }
        return result;
    };
};

my.circularlyOrder = function ( repToComp, comparatorReps ) {
    return my.acc( function ( y ) {
        // unpromoted recommendations
        // [ { recommender: ..., rec: { before: ..., after: ... } },
        //     ... ]
        var urs = my.arrMappend( comparatorReps, function ( it ) {
            return my.arrMap( repToComp( it )( comparatorReps ),
                function ( rec ) {
                    return { recommender: it, rec: rec };
                } );
        } );
        // promoted recommendation graph, transitive closure
        var prg = new TransitiveDag( comparatorReps );
        function alreadyPromoted( before, after ) {
            return prg.hasEdge( before, after );
        }
        function addRec( before, after ) {
            prg.addEdge( before, after, function () {
                throw new Error( "Can't circularlyOrder." );
            } )
        }
        var ucs = comparatorReps;  // unpromoted comparatorReps
        var pcs = [];              // promoted comparatorReps
        function promoteRecs( recs ) {
            my.arrEach( recs, function ( rec ) {
                if ( !alreadyPromoted( rec.after, rec.before ) )
                    addRec( rec.before, rec.after );
            } );
        }
        function promoteCs( cs ) {
            my.arrEach( cs, function ( c ) {
                promoteRecs( my.arrKeep( urs, function ( ur ) {
                   return my.sameTwo( c, ur.recommender );
                } ) );
                y( c );
            } );
            ucs = my.arrSetMinus( my.sameTwo, ucs, cs );
        }
        while ( ucs.length !== 0 ) {
            var consideredCs = my.arrRem( ucs, function ( uc ) {
                return my.arrAny( ucs, function ( it ) {
                    return alreadyPromoted( it, uc );
                } );
            } );
            var consideredRs = my.arrKeep( urs, function ( ur ) {
                return (true
                    && my.arrAny( consideredCs, function ( c ) {
                        return my.sameTwo( c, ur.recommender );
                    } )
                    && my.arrAny( ucs, function ( c ) {
                        return my.sameTwo( c, ur.rec.before );
                    } )
                    && my.arrAny( consideredCs, function ( c ) {
                        return my.sameTwo( c, ur.rec.after );
                    } )
                );
            } );
            var uncontestedCs =
                my.arrRem( consideredCs, function ( uc ) {
                    return my.arrAny( consideredRs, function ( r ) {
                        return my.sameTwo( uc, r.rec.after );
                    } );
                } );
            if ( uncontestedCs.length !== 0 ) {
                promoteCs( uncontestedCs );
            } else {
                
                // NOTE: We would say
                // my.arrMap( consideredRs,
                //     function ( it ) { return it.recommender; } ),
                // except that that could have duplicates.
                //
                promoteCs( my.arrKeep( consideredCs, function ( uc ) {
                    return my.arrAny( consideredRs, function ( r ) {
                        return my.sameTwo( uc, r.recommender );
                    } );
                } ) );
            }
        }
    } );
};

// TODO: Update the Arc version of this comment.
//
// NOTE: We implement this in a sorta spaghetti way just to draw
// parallels with circularlyOrder(). This should actually be totally
// consistent with circularlyOrder() if the comparators and the
// elements being sorted are of types that have no chance of overlap,
// and if the elements are seen as giving no recommendations of their
// own. However, that's not necessarily the case, and even if it were,
// using circularlyOrder for every collection would wastefully re-sort
// the comparators.
//
my.normallyOrder = function ( comparators, elements ) {
    // promoted recommendation graph, transitive closure
    var prg = new TransitiveDag( elements );
    function alreadyPromoted( before, after ) {
        return prg.hasEdge( before, after );
    }
    function addRec( before, after ) {
        prg.addEdge( before, after, function () {
            throw new Error( "Can't normallyOrder." );
        } )
    }
    function promoteRecs( recs ) {
        my.each( recs, function ( rec ) {
            if ( !alreadyPromoted( rec.after, rec.before ) )
                addRec( rec.before, rec.after );
        } );
    }
    // TODO: The Arc version uses 'map and 'rem just before 'each in
    // some places, such as right here. See if those places could be
    // more direct.
    my.each( comparators, function ( compare ) {
        promoteRecs( compare( elements ) );
    } );
    return prg.flatten();
};


my.preferfn = function ( var_args ) {
    var tests = my.arrCut( arguments );
    return function ( rules ) {
        var ranks = my.acc( function ( y ) {
            my.arrEach( tests, function ( test ) {
                var rank = my.arrKeep( rules, test );
                y( rank );
                rules = my.arrSetMinus( my.sameTwo, rules, rank );
            } );
        } );
        return my.acc( function ( y ) {
            while ( 1 < ranks.length ) {
                my.arrEach( ranks.shift(), function ( before ) {
                    my.arrEach( ranks[ 0 ], function ( after ) {
                        y( { before: before, after: after } );
                    } );
                } );
            }
        } );
    };
};


// ===== Predicate dispatch. =========================================


// TODO: See if this should inherit from Error.
function FailureError( failure ) {
    this.error_ = new Error();  // for stack trace
    this.failure_ = failure;
}

// TODO: This can cause side effects or fail, if pprintMessage is set
// up to do that. See if there's an alternative.
FailureError.prototype.toString = function () {
    return my.pprintMessage( this.failure_ );
};

my.raiseFailure = function ( failure ) {
    throw new FailureError( failure );
};


function DubiousResult_() {}
DubiousResult_.prototype.init_ = function ( success, val ) {
    this.success_ = success;
    this.val_ = val;
    return this;
};
DubiousResult_.prototype.failed = function () {
    return !this.success_;
};
DubiousResult_.prototype.val = function () {
    return this.val_;
};

my.win = function ( val ) {
    return new DubiousResult_().init_( !!"success", val );
};
my.fail = function ( val ) {
    return new DubiousResult_().init_( !"success", val );
};

my.getWin = function ( dubiousResult ) {
    if ( dubiousResult.failed() )
        my.raiseFailure( dubiousResult.val() );
    return dubiousResult.val();
};


function RulebookFailure( name, self, args, complaints ) {
    this.name = name;
    this.self = self;
    this.args = args;
    this.complaints = complaints;
}


my.rbApply = function ( self, rb, var_args ) {
    var args = my.arrUnbend( arguments, 2 );
    var complaints = [];
    for ( var i = 0, n = rb.length; i < n; i++ ) {
        var thisCase = rb[ i ];
        var result = my.funcApply( self, thisCase, args );
        if ( result.failed() )
            complaints.push( result.val() );
        else
            return result;
    }
    return my.fail(
        new RulebookFailure( name, self, args, complaints ) );
};

my.rbCall = function ( rb, var_args ) {
    return my.rbApply( null, rb, my.arrCut( arguments, 1 ) );
};

my.caseInstanceof = function ( Type, body ) {
    return function ( var_args ) {
        var first = arguments[ 0 ];
        if ( arguments.length < 1
            || !(typeof first === "object" && first instanceof Type) )
            return my.fail(
                "The first argument wasn't a(n) " + Type.name + "." );
        return my.funcApply( this, body, arguments );
    };
};

my.caseZap = function ( zapper, body ) {
    return function ( var_args ) {
        if ( arguments.length < 1 )
            return my.fail(
                "There were no arguments to a zapPartialfn." );
        var relied = zapper( arguments[ 0 ] );
        // TODO: See if we should verify that the result is a
        // DubiousResult_.
        if ( relied.failed() ) return relied;
        return my.funcApply(
            this, body, relied.val(), my.arrCut( arguments, 1 ) );
    };
};


// TODO: This is meant to be used as global state during debugging.
// Decide how to emphasize and manage this fact.
// TYPE: D -rb> () -> string
my.pprintMessageRb = [];

// TYPE: D -> string
my.pprintMessage = function ( message ) {
    var unrelied = my.rbCall( my.pprintMessageRb, message );
    // If it's an unrecognized type, we just use its toString
    // appearance.
    return unrelied.failed() ? "" + message : unrelied.val();
};

my.pprintMessageRb.push( function ( failure ) {
    if ( !my.isString( failure ) )
        return my.fail( "The failure isn't a string." );
    return my.win( my.kfn( failure ) );
} );

// TODO: Fix this case in Arc.
my.pprintMessageRb.push( my.caseInstanceof( RulebookFailure,
    function ( failure ) {
    
    return my.win( function () {
        return (""
            + "/\n"
            + "Calling rulebook " + failure.name + " on " +
                failure.self + " with " + failure.args + " failed " +
                "with these complaints:\n"
            + my.arrMap( failure.complaints,
                function ( it ) { return my.pprintMessage( it ); } ).
                join( "\n" )
            + "\\\n");
    } );
} ) );


// ===== Extensible iteration utilities. =============================

var pd = my.predicateDispatch = {};

// TYPE: (L> D * D -rb> () -> 2) -k> [ D ] -> 2
pd.is = function ( getIsRb ) {
    return function ( args ) {
        if ( args.length === 0 ) return true;
        args = my.arrCut( args );
        var first = args.shift();
        return my.arrAll( args, function ( arg ) {
            if ( my.sameTwo( first, arg ) ) return true;
            var unrelied = my.rbCall( getIsRb(), first, arg );
            return !unrelied.failed() && unrelied.val()();
        } );
    };
};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// ) -k> D -r> D -s> D
pd.toCheck = function ( getIsRb, getToCheckRb ) {
    return function ( x ) {
        if ( my.isFunction( x ) )
            return my.win( x );
        var unrelied = my.rbCall( getToCheckRb(), x );
        return unrelied.failed() ?
            my.win( function ( y ) {
                return pd.is( getIsRb() )( [ x, y ] );
            } ) :
            unrelied;
    };
};


pd.ifanyRb = {};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// * (L> D * (D -s> D) * (D * D -s> D) * (() -s> D) -rb> () -s> D)
// ) -k> D * D *? (D * D -s> D) *? (() -s> D) -r> () -s> D
pd.ifany = function ( getIsRb, getToCheckRb, getIfanyRb ) {
    return function ( coll, check, opt_then, opt_els ) {
        if ( !my.given( opt_then ) )
            opt_then = function ( elem, checkResult ) {
                return { elem: elem, checkResult: checkResult };
            };
        if ( !my.given( opt_els ) ) opt_els = my.kfn( null );
        var relied = pd.toCheck( getIsRb(), getToCheckRb() )( check );
        if ( relied.failed() ) return relied;
        return my.rbCall(
            getIfanyRb(), coll, relied.val(), opt_then, opt_els );
    };
};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// * (L> D * (D -s> D) * (D * D -s> D) * (() -s> D) -rb> () -s> D)
// ) -k> D * D -r> () -s> D
pd.any = function ( getIsRb, getToCheckRb, getIfanyRb ) {
    return function ( coll, check ) {
        var relied =
            pd.ifany( getIsRb(), getToCheckRb(), getIfanyRb() )(
                coll, check );
        if ( relied.failed() ) return relied;
        return my.win( function () {
            var apart = relied.val()();
            return apart ? apart.checkResult : false;
        } );
    };
};

// TODO: This is a more open-faced implementation of lathe.any(),
// which might allow for extensions which don't rely so much on the
// continuation-passing-style lathe.ifany() and therefore put less
// pressure on the call stack. See if it will be useful.
/*
pd.anyRb = {};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// * (L> D * (D -s> D) -rb> () -s> D)
// ) -k> D * D -r> () -s> D
pd.any = function ( getIsRb, getToCheckRb, getAnyRb ) {
    return function ( coll, check ) {
        var relied = pd.toCheck( getIsRb(), getToCheckRb() )( check );
        if ( relied.failed() ) return relied;
        return my.rbCall( getAnyRb, coll, relied.val() );
    };
};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// * (L> D * (D -s> D) * (D * D -s> D) * (() -s> D) -rb> () -s> D)
// ) -k> D * (D -s> D) -r> () -s> D
pd.anyRb.ifany = function ( getIsRb, getToCheckRb, getIfanyRb ) {
    return function ( coll, check ) {
        var relied =
            pd.ifany( getIsRb(), getToCheckRb(), getIfanyRb() )(
                coll, check );
        if ( relied.failed() ) return relied;
        return my.win( function () {
            var apart = relied.val()();
            return apart ? apart.checkResult : false;
        } );
    };
};
*/


pd.ifanykeyRb = {};

// TYPE:
// (L>
//     D * (D * D -s> D) * (D * D * D -s> D) * (() -s> D)
//         -rb> () -s> D)
//     -k> D * (D * D -s> D) *? (D * D * D -s> D) *? (() -s> D)
//     -r> () -s> D
pd.ifanykey = function ( getIfanykeyRb ) {
    return function ( coll, check, opt_then, opt_els ) {
        if ( !my.given( opt_then ) )
            opt_then = function ( k, v, checkResult ) {
                return { k: k, v: v, checkResult: checkResult };
            };
        if ( !my.given( opt_els ) ) opt_els = my.kfn( null );
        return my.rbCall(
            getIfanykeyRb(), coll, check, opt_then, opt_els );
    };
};

// TYPE:
// (L>
//     D * (D * D -s> D) * (D * D * D -s> D) * (() -s> D)
//         -rb> () -s> D)
//     -k> D * (D * D -s> D) -r> () -s> D
pd.anykey = function ( getIfanykeyRb ) {
    return function ( coll, check ) {
        var relied = pd.ifanykey( getIfanykeyRb() )( coll, check );
        if ( relied.failed() ) return relied;
        return my.win( function () {
            var apart = relied.val()();
            return apart ? apart.checkResult : false;
        } );
    };
};


// TYPE:
// (L>
//     D * (D * D -s> D) * (D * D * D -s> D) * (() -s> D)
//         -rb> () -s> D)
//     -k> D * (D -s> D) * (D * D -s> D) * (() -s> D)
//     -r> () -s> D
pd.ifanyRb.ifanykey = function ( getIfanykeyRb ) {
    return function ( coll, check, then, els ) {
        var relied = pd.ifanykey( getIfanykeyRb() )( coll,
            function ( k, v ) {
                return check( v );
            } );
        if ( relied.failed() ) return relied;
        return my.win( function () {
            var apart = relied.val()();
            return apart ? then( apart.v, apart.checkResult ) : els();
        } );
    };
};


// TODO: Fix this in the Penknife draft. (It passes a function of the
// wrong arity.)
// TYPE:
// (L>
//     D * (D * D -s> D) * (D * D * D -s> D) * (() -s> D)
//         -rb> () -s> D)
//     -k> D * (D * D -s> D) -r> () -s> 2
pd.allkey = function ( getIfanykeyRb ) {
    return function ( coll, check ) {
        var relied = pd.anykey( getIfanykeyRb() )( coll,
            function ( k, v ) {
                return !check( k, v );
            } );
        if ( relied.failed() ) return relied;
        return my.win( function () {
            return !relied.val()();
        } );
    };
};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// * (L> D * (D -s> D) * (D * D -s> D) * (() -s> D) -rb> () -s> D)
// ) -k> D * D -r> () -s> 2
pd.all = function ( getIsRb, getToCheckRb, getIfanyRb ) {
    return function ( coll, check ) {
        var reliedCheck =
            pd.toCheck( getIsRb(), getToCheckRb() )( check );
        if ( reliedCheck.failed() ) return reliedCheck;
        var reliedAny =
            pd.any( getIsRb(), getToCheckRb(), getIfanyRb() )( coll,
                function ( x ) {
                    return !reliedCheck.val()( x );
                } );
        if ( reliedAny.failed() ) return reliedAny;
        return my.win( function () {
            return !relied.val()();
        } );
    };
};

// TYPE:
// (L>
//     D * (D * D -s> D) * (D * D * D -s> D) * (() -s> D)
//         -rb> () -s> D)
//     -k> D * (D * D -s> D) -r> () -s> D
pd.poskey = function ( getIfanykeyRb ) {
    return function ( coll, check ) {
        var relied = pd.ifanykey( getIfanykeyRb() )( coll, check );
        if ( relied.failed() ) return relied;
        return my.win( function () {
            var apart = relied.val()();
            return apart ? apart.k : void 0;
        } );
    };
};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// * (L>
//     D * (D * D -s> D) * (D * D * D -s> D) * (() -s> D)
//     -rb> () -s> D)
// ) -k> D * D -r> () -s> D
pd.pos = function ( getIsRb, getToCheckRb, getIfanykeyRb ) {
    return function ( coll, check ) {
        var relied = pd.toCheck( getIsRb(), getToCheckRb() )( check );
        if ( relied.failed() ) return relied;
        return pd.poskey( getIfanykeyRb() )( coll, function ( k, v ) {
            return reliedCheck.val()( v );
        } );
    };
};

// TYPE:
// (L>
//     D * (D * D -s> D) * (D * D * D -s> D) * (() -s> D)
//         -rb> () -s> D)
//     -k> D * D -r> () -s> D
pd.findkey = function ( getIfanykeyRb ) {
    return function ( coll, check ) {
        var relied = pd.ifanykey( getIfanykeyRb() )( coll, check );
        if ( relied.failed() ) return relied;
        return my.win( function () {
            var apart = relied.val()();
            return apart ? apart.v : void 0;
        } );
    };
};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// * (L> D * (D -s> D) * (D * D -s> D) * (() -s> D) -rb> () -s> D)
// ) -k> D * D -r> () -s> D
pd.find = function ( getIsRb, getToCheckRb, getIfanyRb ) {
    return function ( coll, check ) {
        var relied =
            pd.ifany( getIsRb(), getToCheckRb(), getIfanyRb() )(
                coll, check );
        if ( relied.failed() ) return relied;
        return my.win( function () {
            var apart = reliedAny.val()();
            return apart ? apart.elem : void 0;
        } );
    };
};

// TYPE:
// ( (L> D * D -rb> () -> 2)
// * (L> D -rb> D -s> D)
// * (L> D * (D -s> D) * (D * D -s> D) * (() -s> D) -rb> () -s> D)
// ) -k> D * (D -> 0) -s> 0
pd.each = function ( getIsRb, getToCheckRb, getIfanyRb ) {
    return function ( coll, body ) {
        my.getWin( pd.any( getIsRb(), getToCheckRb(), getIfanyRb() )(
            coll, function ( elem ) {
                body( elem );
                return false;
            } ) )();
    };
};


// TODO: Update these utilities to have explicit parameters like the
// above.
/*
my.asKeyseq = my.rulebook( "asKeyseq" );

my.toKeyseq = my.rulebook( "toKeyseq" );

my.rule( my.toKeyseq, "asKeyseq", function ( x ) {
    var hasResult = false;
    var result;
    var relied = my.fcall( my.asKeyseq, x, function ( val ) {
        if ( hasResult ) throw new Error();
        hasResult = true;
        result = val;
    } );
    if ( relied.failed() ) return relied;
    if ( !hasResult ) throw new Error();
    return my.win( result );
} );

my.iffirstkeyRb = my.rulebook( "iffirstkeyRb" );
my.Keyseq = my.deftype( "Keyseq", my.iffirstkeyRb );

my.iffirstkey = my.failfn( "iffirstkey", function (
    coll, opt_then, opt_els ) {
    
    if ( !my.given( opt_then ) )
        opt_then = function ( k, v, rest ) {
            return { k: k, v: v, rest: rest };
        };
    if ( !my.given( opt_els ) ) opt_els = my.kfn( null );
    return my.fcall( my.iffirstkeyRb, coll, opt_then, opt_els );
} );

my.zapRule( my.ifanykeyRb, "toKeyseq",
    my.latefn( function () { return my.toKeyseq; } ),
    function ( coll, check, then, els ) {
    
    // NOTE: We're saving stack frames by inlining tramplet.
    while ( true ) {
        var apart = my.iffirstkey( coll );
        if ( !apart )
            return my.win( els() );
        
        var k = apart.k, v = apart.v;
        var it = check( k, v );
        if ( it )
            return my.win( then( k, v, it ) );
        coll = apart.rest;
    }
} );

my.toSeqAndBack = my.rulebook( "toSeqAndBack" );

my.asSeq = my.failfn( "asSeq", function ( x, body ) {
    var relied = my.fcall( my.toSeqAndBack, x );
    if ( relied.failed() ) return relied;
    var andBack = relied.val();
    return my.win( andBack.back( body( andBack.val ) ) );
} );

my.toSeq = my.rulebook( "toSeq" );

my.rule( my.toSeq, "toSeqAndBack", function ( x ) {
    var relied = my.fcall( my.toSeqAndBack, x );
    if ( relied.failed() ) return relied;
    return my.win( relied.val().val );
} );

my.zapRule( my.ifanyRb, "toSeq",
    my.latefn( function () { return my.toSeq; } ),
    function ( coll, check, then, els ) {
    
    // NOTE: We're saving stack frames by inlining tramplet.
    while ( true ) {
        // TODO: See if iffirst(), defined below, can be moved up
        // before its usage here.
        var apart = my.iffirst( coll );
        if ( !apart )
            return my.win( els() );
        
        var first = apart.first;
        var it = check( first );
        if ( it )
            return my.win( then( first, it ) );
        coll = apart.rest;
    }
} );


// TODO: In the Penknife draft, fn-ifkeydecap/keydecap-er and
// fn-ifdecap/decap-er, the unwrap calls are missing their "self"
// arguments. Fix that.

my.keycons = my.rulebook( "keycons" );

my.lazykeycons = function ( keyGetter, valGetter, restGetter ) {
    return my.Keyseq.by( function ( then, els ) {
        return then( keyGetter(), valGetter(), restGetter() );
    } );
};

// TODO: Fix this in the Penknife draft. It says "self" where it
// should say "rest".
my.rule( my.keycons, "Keyseq", function ( k, v, rest ) {
    if ( !(rest instanceof my.Keyseq) )
        return my.fail( "It isn't a Keyseq." );
    return my.win( my.Keyseq.by( function ( then, els ) {
        return then( k, v, rest );
    } ) );
} );

my.instanceofRule( my.asKeyseq, "Keyseq", my.Keyseq, function (
    x, body ) {
    
    return my.win( body( x ) );
} );



my.iffirstRb = my.rulebook( "iffirstRb" );
my.Seq = my.deftype( "Seq", my.iffirstRb );

my.iffirst = my.failfn( "iffirst", function (
    coll, opt_then, opt_els ) {
    
    if ( !my.given( opt_then ) )
        opt_then = function ( first, rest ) {
            return { first: first, rest: rest };
        };
    if ( !my.given( opt_els ) ) opt_els = my.kfn( null );
    return my.fcall( my.iffirstRb, coll, opt_then, opt_els );
} );

my.cons = my.rulebook( "cons" );

my.lazycons = function ( firstGetter, restGetter ) {
    return my.Seq.by( function ( then, els ) {
        return then( firstGetter(), restGetter() );
    } );
};

my.rule( my.cons, "Seq", function ( first, rest ) {
    if ( !(rest instanceof my.Seq) )
        return my.fail( "It isn't a Seq." );
    return my.win( my.Seq.by( function ( then, els ) {
        return then( first, rest );
    } ) );
} );

my.instanceofRule( my.toSeqAndBack, "Seq", my.Seq, function (
    x, body ) {
    
    return my.win( { val: x, back: my.idfn } );
} );


my.nilseq = my.Seq.by( function ( then, els ) { return els(); } );


my.map = my.rulebook( "map" );

my.rule( my.map, "asSeq", function ( coll, convert ) {
    return my.fcall( my.asSeq, coll, function ( coll ) {
        return my.namedlet( coll, function ( coll, next ) {
            var apart = my.iffirst( coll );
            if ( apart ) {
                var first = apart.first, rest = apart.rest;
                return my.lazycons(
                    function () { return convert( first ); },
                    function () { return next( rest ); }
                );
            } else {
                // TODO: Fix the Penknife draft, which returns f
                // rather than nil here.
                return my.nilseq;
            }
        } );
    } );
} );


// TODO: Implement eager() for things that are already eager, like
// arrays.

my.eager = my.rulebook( "eager" );

my.rule( my.eager, "keyseq", function ( coll ) {
    var relied = my.fcall( my.iffirstkey, coll );
    if ( relied.failed() ) return relied;
    var apart = relied.val();
    return my.win( apart ?
        my.keycons( apart.k, apart.v, my.eager( apart.rest ) ) :
        my.nilseq );
} );

my.rule( my.eager, "seq", function ( coll ) {
    var relied = my.fcall( my.iffirst, coll );
    if ( relied.failed() ) return relied;
    var apart = relied.val();
    return my.win( apart ?
        my.cons( apart.first, my.eager( apart.rest ) ) : my.nilseq );
} );


// TODO: Port this to the Penknife draft.
my.instanceofRule( my.iffirstkeyRb, "Seq", my.Seq, function (
    coll, then, els ) {
    
    var apart = my.iffirstkey(
        my.namedlet( coll, 0, function ( coll, i, next ) {
            return my.Keyseq.by( function ( then, els ) {
                var apart = my.iffirst( coll );
                if ( apart )
                    return then(
                        i, apart.first, next( apart.rest, i + 1 ) );
                else
                    return els();
            } );
        } ) );
    return my.win(
        apart ? then( apart.k, apart.v, apart.rest ) : els() );
} );


my.toArray = my.rulebook( "toArray" );

my.rule( my.toArray, "each", function ( x ) {
    var relied;
    var result = my.acc( function ( y ) {
        relied = my.fcall( my.each, x, y );
    } );
    if ( relied.failed() ) return relied;
    return my.win( result );
} );


// TODO: Port this to the Penknife draft.

my.foldl = my.rulebook( "foldl" );

my.rule( my.foldl, "each", function ( init, coll, func ) {
    var result = init;
    var relied = my.fcall( my.each, coll,
        function ( it ) { result = func( result, it ); } );
    if ( relied.failed() ) return relied;
    return my.win( result );
} );

my.foldr = my.rulebook( "foldr" );

my.zapRule( my.foldr, "toArray",
    my.latefn( function () { return my.toArray; } ),
    function ( coll, init, func ) {
    
    return my.win( my.arrFoldr( coll, init, function ( a, b ) {
        return func( a, b );
    } ) );
} );


my.rev = my.failfn( "rev", function ( seq ) {
    return my.fcall( my.asSeq, seq, function ( seq ) {
        return my.toSeq( my.arrCut( my.toArray( seq ) ).reverse() );
    } );
} );

// TODO: See if there's a better default for opt_by. It would be nice
// to have a generic, extensible comparator, like is() and isRb() for
// equality.
my.sort = my.failfn( "sort", function ( seq, opt_by ) {
    if ( !my.given( opt_by ) )
        opt_by = function ( a, b ) { return a - b; };
    return my.fcall( my.asSeq, seq, function ( seq ) {
        return my.toSeq(
            my.arrCut( my.toArray( seq ) ).sort( opt_by ) );
    } );
} );

my.tuple = my.failfn( "tuple", function ( size, seq ) {
    var relied = my.fcall( my.toSeqAndBack, seq );
    if ( relied.failed() ) return relied;
    var andBack = relied.val();
    return my.win( andBack.back( my.namedlet( andBack.val,
        function ( seq, nextTuples ) {
            return my.Seq.by( function ( then, els ) {
                // NOTE: We're saving stack frames by inlining
                // tramplet.
                var tuple = my.nilseq;
                var n = 0;
                var rest = seq;
                while ( true ) {
                    if ( n === size )
                        return then(
                            andBack.back( my.rev( tuple ) ),
                            nextTuples( rest ) );
                    var apart = my.iffirst( rest );
                    if ( apart ) {
                        tuple = my.cons( apart.first, tuple );
                        n++;
                        rest = apart.rest;
                    } else if ( n !== 0 ) {
                        throw new TypeError(
                            "Can't tuple into uneven tuples." );
                    } else {
                        return els();
                    }
                }
            } );
        } ) ) );
} );

my.pair = my.failfn( "pair", function ( seq ) {
    return my.fcall( my.tuple, 2, seq );
} );

// Returns a sequence with consecutive duplicates removed. This is
// effective for removing all duplicates from a sorted sequence.
my.dedupGrouped = my.failfn( "dedupGrouped", function (
    seq, opt_eq ) {
    
    if ( !my.given( opt_eq ) ) opt_eq = my.is;
    return my.fcall( my.asSeq, seq, function ( seq ) {
        return my.namedlet( seq, false, void 0, function (
            seq, hasPrev, prev, nextDedup ) {
            
            return my.Seq.by( function ( then, els ) {
                // NOTE: We're saving stack frames by inlining
                // tramplet.
                var rest = seq;
                while ( true ) {
                    var apart = my.iffirst( rest );
                    if ( !apart ) {
                        return els();
                    } else if (
                        hasPrev && opt_eq( prev, apart.first ) ) {
                        rest = apart.rest;
                    } else {
                        var first = apart.first;
                        return then( first,
                            nextDedup( apart.rest, true, first ) );
                    }
                }
            } );
        } );
    } );
} );


// ===== Extensible accumulation utilities. ==========================

my.plus = my.rulebook( "plus" );

// TODO: Give this rule a name in the Penknife draft.
my.rule( my.plus, "unary", function ( opt_result, var_args ) {
    if ( arguments.length !== 1 )
        return my.fail( "There isn't exactly one argument." );
    return my.win( opt_result );
} );

my.binaryPlus = my.rulebook( "binaryPlus" );

// TODO: Give this rule a name in the Penknife draft.
my.rule( my.plus, "binaryPlus", function ( opt_a, opt_b, var_args ) {
    if ( arguments.length < 2 )
        return my.fail( "There aren't at least two arguments." );
    var rest = my.arrCut( arguments, 2 );
    var relied = my.fcall( my.binaryPlus, opt_a, opt_b );
    if ( relied.failed() ) return relied;
    return my.win(
        my.funcApply( null, my.plus, relied.val(), rest ) );
} );


my.sent = my.rulebook( "sent" );

my.sentall = my.rulebook( "sentall" );

my.rule( my.sentall, "foldl", function ( target, elems ) {
    return my.fcall( my.foldl, target, elems, my.sent );
} );

my.rule( my.sentall, "seq", function ( target, elems ) {
    var relied = my.fcall( my.iffirst, elems );
    if ( relied.failed() ) return relied;
    var apart = relied.val();
    return my.win( !apart ? target :
        my.sentall( my.sent( target, apart.first ), apart.rest ) );
} );


my.unbox = my.rulebook( "unbox" );


my.toPlusAdder = my.rulebook( "toPlusAdder" );

// TODO: In the Penknife draft, change this from a fun* to a rule*.
// NOTE: This can't be a zapRule since it has two failure conditions.
my.rule( my.plus, "toPlusAdder", function ( opt_first, var_args ) {
    if ( arguments.length < 1 )
        return my.fail( "There are no arguments." );
    var rest = my.arrCut( arguments, 1 );
    var relied = my.fcall( my.toPlusAdder, opt_first );
    if ( relied.failed() ) return relied;
    return my.win( my.unbox( my.sentall( relied.val(), rest ) ) );
} );


// TODO: In the Penknife Draft, stop using rely twice. That could make
// this rule take more than constant time to fail.
// TODO: In the Penknife draft, use asSeq instead of toSeq.
my.rule( my.binaryPlus, "asSeq", function ( a, b ) {
    return my.fcall( my.asSeq, a, function ( a ) {
        b = my.toSeq( b );
        return my.namedlet( a, function ( a, next ) {
            return my.Seq.by( function ( then, els ) {
                
                var apartA = my.iffirst( a );
                if ( apartA )
                    return then( apartA.first, next( apartA.rest ) );
                
                // TODO: Fix this in the Penknife draft. It just
                // returns b, rather than destructuring it.
                var apartB = my.iffirst( b );
                if ( apartB )
                    return then( apartB.first, apartB.rest );
                
                return els();
            } );
        } );
    } );
} );


my.mappend = function ( first, coll, func ) {
    return my.funcApply(
        null, my.plus, first, my.toArray( my.map( coll, func ) ) );
};

my.flatmap = my.rulebook( "flatmap" );

my.rule( my.flatmap, "map", function ( first, coll, func ) {
    var relied = my.fcall( my.map, coll, func );
    if ( relied.failed() ) return relied;
    return my.win( my.flat( relied.val() ) );
} );

// TODO: According to <http://google-styleguide.googlecode.com/svn/
// trunk/javascriptguide.xml>, it may be better to set this up in a
// way that doesn't calculate the length every time. Is that possible?
//
// TODO: Figure out what to do about concurrent modification to the
// underlying array (in any of these utilities!).
//
my.rule( my.toSeqAndBack, "likeArray", function ( x ) {
    if ( !my.likeArray( x ) ) return my.fail( "It isn't likeArray." );
    return my.win( {
        val: my.namedlet( 0, function ( i, next ) {
            return my.Seq.by( function ( then, els ) {
                if ( i < x.length )
                    return then( x[ i ], next( i + 1 ) );
                return els();
            } );
        } ),
        back: function ( x ) { return my.toArray( x ); }
    } );
} );

// TODO: See if array concatenation should use send() instead.
my.rule( my.binaryPlus, "likeArray", function ( a, b ) {
    if ( !my.likeArray( a ) )
        return my.fail( "The first argument isn't likeArray." );
    if ( !my.likeArray( b ) )
        return my.fail( "The second argument isn't likeArray." );
    return my.win( a.concat( b ) );
} );

// TODO: See if this is necessary.
my.rule( my.ifanyRb, "likeArray",
    function ( coll, check, then, els ) {
    
    if ( !my.likeArray( coll ) )
        return my.fail( "It isn't likeArray." );
    var result = my.arrAny( coll, check );
    return my.win( result ? then( result ) : els() );
} );
*/


// ===== DOM utilities. ==============================================

my.el = function ( domElementId ) {
    return getElementById( domElementId );
};

var handle, unhandle;
if ( document_addEventListener ) {
    handle = function ( el, eventName, handler ) {
        el.addEventListener( eventName, handler, !"capture" );
    };
    unhandle = function ( el, eventName, handler ) {
        el.removeEventListener( eventName, handler, !"capture" );
    };
} else {  // IE
    handle = function ( el, eventName, handler ) {
        el.attachEvent( "on" + eventName, handler );
    };
    unhandle = function ( el, eventName, handler ) {
        el.detachEvent( "on" + eventName, handler );
    };
}

function appendOneDom( el, part ) {
    if ( my.likeArray( part ) )
        for ( var i = 0, n = part.length; i < n; i++ )
            appendOneDom( el, part[ i ] );
    else if ( my.isString( part ) )
        el.appendChild(
            el.ownerDocument.createTextNode( "" + part ) );
    else if ( my.likeObjectLiteral( part ) )
        my.objOwnEach( part, function ( k, v ) {
            if ( my.isFunction( v ) )
                handle( el, k, v );
            else if ( my.isString( v ) )
                el.setAttribute( k, "" + v );
            else
                throw new Error(
                    "Unrecognized map arg to appendDom(), dom(), " +
                    "or domInDoc()." );
        } );
    // TODO: Figure out how to do a multi-document "instanceof
    // Element" check.
    else
        el.appendChild( part );
//    else if ( part instanceof Element )
//        el.appendChild( part );
//    else
//        throw new Error(
//            "Unrecognized list arg to appendDom(), dom(), or " +
//            "domInDoc()." );
    return el;
}

my.appendDom = function ( el, var_args ) {
    return appendOneDom( el, my.arrCut( arguments, 1 ) );
};

my.domInDoc = function ( doc, el, var_args ) {
    if ( my.isString( el ) )
        el = doc[ "createElement" ]( el );
    // TODO: Figure out how to do a multi-document "instanceof
    // Element" check.
    else
        while ( el.hasChildNodes() )
            el.removeChild( el.firstChild );
//    else if ( el instanceof Element )
//        while ( el.hasChildNodes() )
//            el.removeChild( el.firstChild );
//    else
//        throw new Error( "Unrecognized name arg to dom()." );
    return appendOneDom( el, my.arrCut( arguments, 2 ) );
};

my.dom = function ( el, var_args ) {
    return my.domInDoc( document, el, my.arrCut( arguments, 1 ) );
};

my.setFrameSrcdoc = function ( el, srcdoc ) {
    // This has been tested with the following browsers, under 64-bit
    // Windows 7:
    //
    // Firefox 20.0.1
    // Opera 12.15
    // IE 10.0.9200.16540
    // Chrome 26.0.1410.64 m
    
    // This only works in Chrome.
//    el.setAttribute( "srcdoc", srcdoc );
    
    // This only works in Firefox and Opera. In Chrome, the document
    // itself loads, but it doesn't have permission to load external
    // stylesheets or JS code (at least if the parent frame is being
    // accessed from a file: URL).
//    el.src = "data:text/html," + encodeURIComponent( srcdoc );
    
    // This works in all four of the browsers.
    el.src = "about:blank";
    var doc = el.contentDocument;
    doc.open();
    doc.write( srcdoc );
    doc.close();
};

function makePostMessageFrame(
    holder, create, init, opt_then, opt_timeout ) {
    
    var hash = "#" + random();
    var finished = false;
    function finish( result ) {
        if ( finished || !my.given( opt_then ) ) return;
        finished = true;
        unhandle( window, "message", onMessage );
        opt_then( result );
    }
    function onMessage( e ) {
        var data = e.data;
        if ( my.likeObjectLiteral( data ) && data[ "hash" ] === hash )
            finish( { "val": data[ "val" ] } );
    }
    if ( my.given( opt_then ) )
        handle( window, "message", onMessage );
    var frame = create();
    holder.appendChild( frame );
    my.appendDom( frame, { "load": function () {
        holder.removeChild( frame );
        if ( opt_timeout !== 1 / 0 )
            setTimeout( function () {
                finish( false );
            }, my.given( opt_timeout ) ? opt_timeout : 0 );
    } } );
    init( frame, hash );
}

// This fetches a value cross-origin using an iframe and
// postMessage(). Here's an example of a document that works with it:
//
// <!DOCTYPE html>
// <meta charset="utf-8">
// <title></title>
// <script type="text/plain" id="datahtml">
// application/x-rocketnia-choppascript
// Here's some text.
// 
// Strings like "<@/script>" and "<@!--" (without the @@ signs) can be
// troublesome, JS has no standardized multiline string support, and
// cross-origin AJAX requests can be a pain.
// 
// This example demonstrates a combination of workarounds. Though it
// may appear more secure than JSONP, don't get your hopes up. I only
// intend to use this for communication between multiple origins I
// control (like local files). For REST APIs, I recommend
// CORS.
// </script>
// <textarea style="width: 100%; height: 300px;" id="t"></textarea>
// <script>
// var m = /^\n([^\n]+)\n((?:[^\n]|\n)*)\n$/.exec(
//     document.getElementById( "datahtml" ).textContent.replace(
//         /<@(@*[\/!])/g, "<$1" ) );
// parent.postMessage( { hash: location.hash,
//     val: { type: m[ 1 ], text: m[ 2 ] } }, "*" );
// document.getElementById( "t" ).value = m[ 2 ];
// </script>
// </html>
//
my.fetchFrame = function ( holder, url, opt_then, opt_timeout ) {
    makePostMessageFrame( holder,
        function () { return my.dom( "iframe" ); },
        function ( frame, hash ) { frame.src = url + hash; },
        opt_then, opt_timeout );
};

// This parses a document in the same form as the example above for
// fetchFrame(). It finds the first instance of "datahtml" and the
// first instance of "</" after that, and it cuts out those lines and
// all the ones surrounding them. Then it removes one @ from all
// sequences of <@@@! or <@@@/ (where @@@ stands in for any nonzero
// sequence of @) and treats the first line as a type tag describing
// the remaining text.
//
// NOTE: Because of peculiarities of HTML and JavaScript, the DataHtml
// format is probably not perfect for encoding all kinds of binary or
// even textual data. For instance, HTML treats all newlines as
// indistinguishable, and there is no entity escape for carriage
// return. JavaScript uses UTF-16 code points. Still, this should be
// sufficient for ASCII source code. (Sorry, speakers of languages
// with non-ASCII characters.)
//
// TODO: Redesign DataHtml to be a more perfect encoding format.
//
my.parseDataHtml = function ( string ) {
    var lines = string.split( /\n/g );
    var onType, onText;
    var type, text = [];
    var ends = false;
    for ( var i = 0, n = lines.length; i < n; i++ ) {
        var line = lines[ i ];
        if ( onText ) {
            if ( /<\//.test( line ) ) {
                ends = true;
                break;
            }
            text.push( line.replace( /<@(@*[\/!])/g, "<$1" ) );
        } else if ( onType ) {
            if ( /<\//.test( line ) )
                ret( null );
            else
                type = line.replace( /<@(@*[\/!])/g, "<$1" );
            onText = true;
        } else if ( /datahtml/.test( line ) ) {
            onType = true;
        }
    }
    if ( !ends )
        return null;
    return { type: type, text: text.join( "\n" ) };
    
    // TODO: See if the following is sufficient. It probably isn't as
    // efficient.
//    var m =
//        /^(?:(?!datahtml)[\s\S]*)datahtml[^\n]*\n((?:(?!<\/)[^\n])*)\n((?:(?!<\/)[\s\S])*)\n[^\n]*<\/[\s\S]$/.
//            test( string );
//    return m === null ? null : {
//        type: m[ 1 ].replace( /<@(@*[\/!])/g, "<$1" ),
//        text: m[ 2 ].replace( /<@(@*[\/!])/g, "<$1" ) };
};

// TODO: Check for characters that can't be represented in HTML, such
// such as carriage return.
my.renderDataHtml = function ( type, text ) {
    if ( /\n/.test( type ) )
        return null;
    function escape( data ) {
        return data.replace( /<(@*[\/!])/g, "<@$1" );
    }
    return (
"<" + "!DOCTYPE html>\n" +
"<meta charset=\"utf-8\">\n" +
"<title><" + "/title>\n" +
"<script type=\"text/plain\" id=\"datahtml\">\n" +
escape( type ) + "\n" +
escape( text ) + "\n" +
"<" + "/script>\n" +
"<textarea style=\"width: 100%; height: 300px\" id=\"t\"" +
    "><" + "/textarea>\n" +
"<script>\n" +
"var m = /^\\n([^\\n]+)\\n((?:[^\\n]|\\n)*)\\n$/.exec(\n" +
"    document.getElementById( \"datahtml\" ).textContent.replace(\n" +
"        /<@(@*[\\/!])/g, \"<$1\" ) );\n" +
"parent.postMessage( { hash: location.hash,\n" +
"    val: { type: m[ 1 ], text: m[ 2 ] } }, \"*\" );\n" +
"document.getElementById( \"t\" ).value = m[ 2 ];\n" +
"<" + "/script>\n" +
"<" + "/html>\n");
};

// TODO: Test this. It probably doesn't work, and it probably isn't
// very useful in this incarnation anyway.
my.evalHtmlInFrame = function (
    holder, code, opt_then, opt_timeout ) {
    
    makePostMessageFrame( holder,
        function () {
            return my.dom( "iframe", { "sandbox": "allow-scripts" } );
        },
        function ( frame, hash ) {
            frame.contentDocument.innerHTML = code;
            // TODO: Somehow disable the iframe from having
            // same-origin privileges with us.
            // TODO: See if the following actually sets the hash. It
            // probably doesn't.
            frame.src = hash;
        },
        opt_then, opt_timeout );
};

// This evaluates a single arbitrary piece of JavaScript code rather
// than a full-powered asynchronous operation, but this itself isn't
// synchronous.
my.evalSyncJsInFrame = function (
    holder, code, opt_then, opt_timeout ) {
    
    makePostMessageFrame( holder,
        function () {
            return my.dom( "iframe", { "sandbox": "allow-scripts" } );
        },
        function ( frame, hash ) {
            var doc = frame.contentDocument;
            // TODO: See if the code still needs to be sanitized (for
            // instance, to remove "</" and "<!").
            my.appendDom( doc.body, my.domInDoc( doc, "script",
                { "type": "text/javascript" },
                "parent.postMessage( {" +
                "    hash: " + toJson( hash ) + ", " +
                "    val: eval( " + toJson( code ) + " ) }, \"*\" );"
            ) );
            // TODO: Somehow disable the iframe from having
            // same-origin privileges with us.
        },
        opt_then, opt_timeout );
};

// This takes arbitrary JavaScript code that eval's to a function, and
// it calls that function with a callback that should eventually be
// called with the result. There's no particular way to communicate an
// error, so be sure the code catches errors itself and encodes them
// in the result value, or you won't be able to detect them.
// TODO: Test this.
my.evalJsInFrame = function ( holder, code, opt_then, opt_timeout ) {
    makePostMessageFrame( holder,
        function () {
            return my.dom( "iframe", { "sandbox": "allow-scripts" } );
        },
        function ( frame, hash ) {
            var doc = frame.contentDocument;
            // TODO: See if the code still needs to be sanitized (for
            // instance, to remove "</" and "<!").
            my.appendDom( doc.body, my.domInDoc( doc, "script",
                { "type": "text/javascript" },
                "eval( " + toJson( code ) + " )( function ( val ) {" +
                "    parent.postMessage( {" +
                "        hash: " + toJson( hash ) + ", " +
                "        val: val }, \"*\" );" +
                "} );"
            ) );
            // TODO: Somehow disable the iframe from having
            // same-origin privileges with us.
        },
        opt_then, opt_timeout );
};


// ===== Binary encoding/decoding. ===================================

// We use a rich vocabulary to describe the values these utilities
// deal with. The terms simultaneously describe the bit layout of the
// value and, if applicable, the JavaScript value it will be encoded
// into or decoded from.
//
//   be16 - A big-endian 16-bit unsigned integer, encoded by default
//     as a JavaScript number.
//   byte - An alternate name for be8.
//   bit - An alternate name for be1.
//   be16s - A sequence of be16 values, encoded by default as an Array
//     of encoded be16 values--that is, as an Array of JavaScript
//     numbers.
//   be16chars - A sequence of be16 values, encoded (losslessly) as
//     char codes of a JavaScript string.
//   b64 - A sequence of be8 values, encoded as a base64 string.
//   fp64 - A JavaScript number, which in a binary encoding context
//     will be enccoded as an IEEE 754 64-bit floating point value--a
//     format described at <http://en.wikipedia.org/wiki/
//     Double_precision_floating-point_format>--with JavaScript's NaN
//     converting to FFFFFFFFFFFFFFFF. Other IEE 754 NaNs will decode
//     to JavaScript's NaN, so this is a lossy format for binary. An
//     fp64 value in a bit sequence is considered to start with the
//     sign bit, continue through the exponent bits in big-endian
//     order, then continue through the mantissa bits in big-endian
//     order.
//   fp64s - A sequence of fp64 values, encoded by default as an Array
//     of encoded fp64 values--that is, as an Array of JavaScript
//     numbers, normalizing every NaN to the same value.
//
// TODO: Figure out if little-endian should be an option too. If so,
// here's the kind of terminology we would use:
//
//   le8bit - An unsigned 8-bit integer with its bits in little-endian
//     order. Silly?
//   le128be32 - An unsigned 128-bit integer with big-endian 32-bit
//     chunks in little-endian order.
//   lebe64 - Shorthand for le128be64. "Twice as big" is a reasonable
//     default container size.
//   le128 - Shorthand for le128be8. Be8 is a reasonable default chunk
//     size.
//   le16 - The preferred shorthand for le16be8. The lebe8 shorthand
//     is equivalent, but it's longer and less obvious about the total
//     number of bits.
//   be128lebe16 - An unsigned 128-bit integer with chunks in
//     big-endian order, where each chunk is a 32-bit integer with
//     16-bit big-endian chunks in little-endian order.
//   le64fp64 - An fp64 encoding as a 64-bit unsigned integer in the
//     encoding determined by le64. That is, its 8 bytes are reversed
//     from normal fp64 order. Note that this kind of ordering will
//     tend to break up the mantissa (and sometimes the exponent) into
//     noncontiguous regions of the binary sequence.
//
// TODO: Figure out if typed arrays make it possible to distinguish
// between NaNs.

// TODO: This is global state. Decide how to emphasize and manage this
// fact.
var pow2cache = {};
function pow2( exp ) {
    return pow2cache[ exp ] || (pow2cache[ exp ] = pow( 2, exp ));
}

// TODO: Figure out what to do when there aren't exactly two be32s.
my.be32sToFp64 = function ( be32s ) {
    var high = be32s[ 0 ];
    var neg = (high & 0x80000000) ? -1 : 1;
    var exp = (high & 0x7FF00000) >>> 20;
    var mantissa = (high & 0x000FFFFF) * 0x0100000000 + be32s[ 1 ];
    if ( exp === 0x7FF )
        return mantissa === 0 ? neg * 1 / 0 : 0 / 0;
    if ( exp === 0x000 ) {
        if ( mantissa === 0 )
            return neg * 0;
        exp = 0x001;         // subnormal
    } else {
        mantissa += 0x0010000000000000;  // normal
    }
    // NOTE: Be careful with the order of operations here.
    return mantissa / 0x0010000000000000 * pow2( exp - 0x3FF ) * neg;
};

my.fp64ToBe32s = function ( num ) {
    if ( num !== num ) return [ 0xFFFFFFFF, 0xFFFFFFFF ];    // NaN
    if ( num === 1 / 0 ) return [ 0x7FF00000, 0x00000000 ];
    if ( num === -1 / 0 ) return [ 0xFFF00000, 0x00000000 ];
    if ( num === 0 ) return [
        (1 / num < 0 ? 0x80000000 : 0x00000000), 0x00000000 ];
    var neg = num < 0;
    num = neg ? -num : num;
    var exp = floor( log( num ) / ln2 );
    var pow = pow2( exp );
    while ( pow <= num ) {
        exp++;
        pow *= 2;
    }
    exp--;
    pow = pow2( exp );     // Above, pow might have reached Infinity.
    while ( num < pow ) {
        exp--;
        pow = pow2( exp );
    }
    var subnormal = exp < -0x3FE;
    if ( subnormal ) exp = -0x3FE;
    var mantissa = num / pow2( exp ) * 0x0010000000000000;
    if ( !subnormal ) mantissa -= 0x0010000000000000;
    return [
        (neg ? 0x80000000 : 0x00000000) +
            (subnormal ? 0x000 : ((exp + 0x3FF) << 20)) +
            floor( mantissa / 0x0100000000 ),
        // NOTE: Since 0xFFFFFFFF & 0xFFFFFFF === -1,
        // "mantissa & 0xFFFFFFFF" doesn't suffice here.
        (mantissa >>> 16 & 0xFFFF) * 0x010000 + (mantissa & 0xFFFF)
    ];
};

// debugging utilities
/*
function hext( num ) {
    var be32s = my.fp64ToBe32s( num );
    var a = ("00000000" + be32s[ 0 ].toString( 16 )).toUpperCase();
    var b = ("00000000" + be32s[ 1 ].toString( 16 )).toUpperCase();
    return a.substring( a.length - 8 ) + b.substring( b.length - 8 );
}

function test( num ) {
    var result = my.be32sToFp64( my.fp64ToBe32s( num ) );
    return num !== num ? result !== result :
        num === 0 ? 1 / num === 1 / result : num === result;
}
*/

var b64digits =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" + "0123456789" + "+/";

function accB64( body ) {
    var remainder = 0x00000000;
    var remainderLen = 0;
    var digits = [];
    function write( numBytes, val ) {
        var numBits = numBytes * 8;
        remainder = (remainder << numBits) + val;
        remainderLen += numBits;
        while ( 6 <= remainderLen ) {
            var diff = remainderLen - 6;
            var digit = remainder >>> diff;
            digits.push( b64digits.charAt( digit ) );
            remainder -= digit << diff;
            remainderLen -= 6;
        }
    }
    body( write );
    if ( remainderLen === 2 ) {
        write( 2, 0x0000 );
        digits.pop();
        digits.pop();
        digits.push( "==" );
    } else if ( remainderLen === 4 ) {
        write( 2, 0x0000 );
        digits.pop();
        digits.pop();
        digits.push( "=" );
    }
    return digits.join( "" );
}

my.be32sToB64 = function ( be32s ) {
    return accB64( function ( y ) {
        for ( var i = 0, len = be32s.length; i < len; i++ ) {
            var be32 = be32s[ i ];
            y( 2, 0 | (be32 / 0x010000) );
            y( 2, be32 & 0xFFFF );
        }
    } );
};

my.be16sToB64 = function ( shortArray ) {
    return accB64( function ( y ) {
        for ( var i = 0, len = shortArray.length; i < len; i++ )
            y( 2, shortArray[ i ] );
    } );
};

my.bytesToB64 = function ( byteArray ) {
    return accB64( function ( y ) {
        for ( var i = 0, len = byteArray.length; i < len; i++ )
            y( 1, byteArray[ i ] );
    } );
};

my.be16charsToB64 = function ( string ) {
    return accB64( function ( y ) {
        for ( var i = 0, len = string.length; i < len; i++ )
            y( 2, string.charCodeAt( i ) );
    } );
};

// TODO: Figure out what to do about remaining bytes.
my.b64ToBe32s = function ( b64 ) {
    var x = 32;
    // NOTE: The remainder is a 36-bit value. JavaScript numbers can
    // handle that without rounding or truncation as long as we don't
    // use bitwise operations.
    var remainder = 0x000000000;
    var remainderLen = 0;
    var result = [];
    for ( var i = 0, len = b64.length; i < len; i++ ) {
        var digitString = b64.charAt( i );
        if ( digitString === "=" ) break;
        var digit = b64digits.indexOf( digitString );
        if ( digit === -1 ) throw new Error();
        remainder *= 0x40;
        remainder += digit;
        remainderLen += 6;
        if ( x <= remainderLen ) {
            var diff = remainderLen - x;
            var pow = pow2( diff );
            var el = floor( remainder / pow );
            result.push( el );
            remainder -= el * pow;
            remainderLen -= x;
        }
    }
    return result;
};

function b64ToYieldedBeXs( b64, x, y ) {
    // NOTE: The remainder is an x-plus-4-bit value.
    var remainder = 0x00000;
    var remainderLen = 0;
    for ( var i = 0, len = b64.length; i < len; i++ ) {
        var digitString = b64.charAt( i );
        if ( digitString === "=" ) break;
        var digit = b64digits.indexOf( digitString );
        if ( digit === -1 ) throw new Error();
        remainder = (remainder << 6) | digit;
        remainderLen += 6;
        if ( x <= remainderLen ) {
            var diff = remainderLen - x;
            var el = remainder >> diff;
            y( el );
            remainder -= el << diff;
            remainderLen -= x;
        }
    }
}

// TODO: Figure out what to do about remaining bytes.
my.b64ToBe16s = function ( b64 ) {
    return my.acc( function ( y ) {
        b64ToYieldedBeXs( b64, 16, y );
    } );
};

// TODO: Figure out what to do about remaining bytes.
my.b64ToBe16chars = function ( b64 ) {
    return my.acc( function ( y ) {
        b64ToYieldedBeXs( b64, 16, function ( x ) {
            y( fromCharCode( x ) );
        } );
    } ).join( "" );
};

var b64DigitLookup = my.objAcc( function ( y ) {
    for ( var i = 0, n = b64digits.length; i < n; i++ )
        y( "" + b64digits.charCodeAt( i ), i );
} );
my.b64ToBytes = function ( b64 ) {
    // NOTE: We could easily implement this like so, but we're
    // hand-optimizing it instead.
//    return my.acc( function ( y ) {
//        b64ToYieldedBeXs( b64, 8, y );
//    } );
    if ( !/^[a-zA-Z01-9+\/]*=?=?$/.test( b64 ) )
        throw new Error();
    var b64Len = b64.length;
    if ( b64Len % 4 !== 0 )
        throw new Error();
    var resultLen = (b64Len >> 2) * 3;
    if ( b64.charAt( b64Len - 2 ) === "=" )
        resultLen -= 2;
    else if ( b64.charAt( b64Len - 1 ) === "=" )
        resultLen -= 1;
    var midEnd = (b64Len >> 2) * 4;
    var result = typeof Uint8Array === "undefined" ?
        new Array( resultLen ) : new Uint8Array( resultLen );
    var srcI = 0, dstI = 0;
    while ( srcI < midEnd ) {
        var midChunk =
            (b64DigitLookup[ b64.charCodeAt( srcI++ ) ] << 18) |
            (b64DigitLookup[ b64.charCodeAt( srcI++ ) ] << 12) |
            (b64DigitLookup[ b64.charCodeAt( srcI++ ) ] << 6) |
            b64DigitLookup[ b64.charCodeAt( srcI++ ) ];
        result[ dstI++ ] = midChunk >> 16;
        result[ dstI++ ] = (midChunk >> 8) & 0xFF;
        result[ dstI++ ] = midChunk & 0xFF;
    }
    if ( dstI < b64Len ) {
        var endChunk =
            (b64DigitLookup[ b64.charCodeAt( srcI++ ) ] << 18) |
            (b64DigitLookup[ b64.charCodeAt( srcI++ ) ] << 12) |
            ((b64DigitLookup[ b64.charCodeAt( srcI++ ) ] || 0) << 6) |
            (b64DigitLookup[ b64.charCodeAt( srcI++ ) ] || 0);
        result[ dstI++ ] = endChunk >> 16;
        if ( dstI < b64Len )
            result[ dstI++ ] = (endChunk >> 8) & 0xFF;
        if ( dstI < b64Len )
            result[ dstI ] = endChunk & 0xFF;
    }
    return result;
};

my.fp64sToB64 = function ( numArray ) {
    return my.be32sToB64( my.arrMappend( numArray, my.fp64ToBe32s ) );
};

// TODO: Figure out what to do about remaining bytes.
my.b64ToFp64s = function ( b64 ) {
    return my.arrMap(
        my.pair( my.b64ToBe32s( b64 ) ), my.be32sToFp64 );
};



// ===== Disorganized utilities. =====================================
//
// TODO: Continuously prune this section down.



// TODO: This is meant to be used as global state during debugging.
// Decide how to emphasize and manage this fact.
// TODO: Add more rules to this.
// TYPE: D -rb> () -> string
my.blahppRb = [];

// TYPE: D -> string
my.blahpp = function ( x ) {
    return my.getWin( my.rbCall( my.blahppRb, x ) )();
};

my.blahppRb.push( function ( x ) {
    if ( !my.isString( x ) )
        return my.fail( "It isn't a string." );
    return my.win( function () {
        return "\"" + my.arrMap( x.split( /\\/ ), function ( part ) {
            return part.replace( /\"/g, "\\\"" ).replace( /\n/g, "\\n" ).
                replace( /\r/g, "\\r" ).replace( /\t/g, "\\t" ).
                replace( /\x08/g, "\\b" ).replace( /\f/g, "\\f" ).
                replace( /\0/g, "\\0" ).replace( /\v/g, "\\v" ).
                replace( /[^\u0020-\u008F]/g, function ( cha ) {
                    var code =
                        cha.charCodeAt( 0 ).toString( 16 ).toUpperCase();
                    return "\\u" +
                        ("0000" + code).substring( 4 - code.length );
                } );
        } ).join( "\\\\" ) + "\"";
    } );
} );

my.blahppRb.push( function ( x ) {
    if ( !my.likeArray( x ) )
        return my.fail( "It isn't likeArray." );
    return my.win( function () {
        return x.length === 0 ? "[]" :
            "[ " + my.arrMap( x, my.blahpp ).join( ", " ) + " ]";
    } );
} );

my.blahppRb.push( function ( x ) {
    if ( x !== void 0 )
        return my.fail( "It isn't undefined." );
    return my.win( my.kfn( "void 0" ) );
} );

// This, followDeclarationSync(), is a simplified version of
// followDeclaration(), without support for asynchronous intermediate
// calculations. You may want to understand this utility first but
// then switch to followDeclaration() as soon as you do.
//
// This takes a "lead" and follows it. A lead can split apart into
// sub-leads and clues, and sometimes a lead might be impossible to
// follow until certain clues have been found elsewhere. Once all the
// leads have run dry, the tree of clues is returned. This utility is
// mainly useful when loading a declarative program where some parts
// of the program are indecipherable (or unavailable, or not even
// presumed to exist) until another part of the program specifies how
// to get at them. I (Ross) find this case comes up surprisingly
// often... or at least in two places, library-provided syntax and
// library-provided module loading mechanisms.
//
// Technically, a *lead* is an object with a "follow" method that
// takes the current *tree* and the lead's *path* and returns a
// *patch*. A *tree* is a root *node*. A *path* is an Array of
// integers saying where a node is in a tree. A *node* is either
// immature or mature. An *immature node* is an object with a "lead"
// field containing the currently pending lead at that node, a "path"
// field containing the node's path in the tree, and an absent or
// falsy "leads" field. A *mature node* is the same object with its
// "lead" field set to null and with two additional fields: "clue"
// (optional, containing a *clue*, which is actually allowed to be
// any kind of value) and "branches" (containing an Array of nodes).
// A *patch* is either a falsy value, indicating that the lead isn't
// ready to mature yet, or an object containing the details of how to
// mature its node: An optional "clue" field to use for the lead's
// "clue" field, and a "leads" field containing an Array of leads to
// follow in the branches. The "leads" field of a patch can be falsy
// or absent, in which case it defaults to an empty Array.
//
// All in all, this is a very leaky abstraction. It maintains a single
// lead tree and mutates it along the way, passing it over and
// over to the various leads so they can check it to see if they're
// ready to continue. One could easily mutate the tree in one's own
// special ways and cause all sorts of confusing havoc. Of course, if
// one gets confused, one told one so. ;)
//
// TODO: Test this.
//
my.followDeclarationSync = function ( rootLead ) {
    var tree = { "lead": rootLead, "path": [] };
    var leaves = [ tree ];
    pass: while ( true ) {
        var len = leaves.length;
        if ( len === 0 )
            return tree;
        for ( var i = 0; i < len; i++ ) {
            var leaf = leaves.shift();
            var path = leaf[ "path" ];
            var lead = leaf[ "lead" ];
            var patch = lead[ "follow" ]( tree, path );
            if ( patch ) {
                
                // TODO: Does this help at all? The point is to help
                // release no-longer-needed memory.
                leaf[ "lead" ] = null;
                
                if ( "clue" in patch )
                    leaf[ "clue" ] = patch[ "clue" ];
                leaf[ "branches" ] = my.arrMap(
                    patch[ "leads" ] || [], function ( lead, i ) {
                    
                    var leaf = { "lead": lead,
                        "path": path.concat( [ i ] ) };
                    // By pushing the branches to the end of the line,
                    // we're doing a breadth-first traversal. This
                    // could just as easily be .unshift() for a
                    // depth-first traversal.
                    leaves.push( leaf );
                    return leaf;
                } );
                continue pass;
            } else {
                // However, this can't be .unshift() because then we'd
                // try the same dud leaf over and over.
                leaves.push( leaf );
            }
        }
        throw new Error( "Lead deadlock!" );
    }
};

// Like followDeclarationSync(), this follows a "lead" as it unfolds
// into a branching tree of sub-leads and "clues". It's a way to make
// sense of a declarative program in which not all of the declarations
// are known/meaningful until *the program itself* specifies how to
// get at them.
//
// Unlike followDeclarationSync(), this is asynchronous--and yet it
// can also be used in a synchronous context by specifying that it
// should give up instead of trying anything asynchronous. These
// features change the interface of this utility in two places.
//
// First, this takes a callback parameter of the form
// (function ( error, result ) {}), which it eventually calls with
// either a truthy error value and an unspecified result value or a
// falsy error value and the usual clue-tree result. It also takes an
// optional boolean parameter to specify whether it should give up
// instead of actually trying to do something asynchronous. Finally,
// for convenience, the immediate return value of followDeclaration()
// is a boolean indicating whether it finished its entire computation
// synchronously.
//
// Second, the leads' "follow" methods must also conform to this
// convention. That is, they must now take four parameters--the
// clue-tree so far, the path of the lead, a two-parameter callback
// (taking an error and a result), and a restrict-to-synchronous
// boolean--and they *must* return a we-finished-synchronously
// boolean.
//
// TODO: Test this.
//
my.followDeclaration = function ( rootLead, then, opt_sync ) {
    var tree = { "lead": rootLead, "path": [] };
    return followDeclarationStep( tree, [ tree ], 0, then, opt_sync );
};

function followDeclarationStep(
    tree, leaves, leavesChecked, then, opt_sync ) {
    
    var error = null;
    var thisSync = true;
    while ( thisSync ) {
        if ( leaves.length === 0 ) return then( null, tree ), true;
        if ( leaves.length === leavesChecked )
            return then( new Error( "Lead deadlock!" ) ), true;
        var leaf = leaves.shift();
        var path = leaf[ "path" ];
        var lead = leaf[ "lead" ];
        if ( !lead[ "follow" ]( tree, path, function ( e, patch ) {
            if ( error = e ) return void (thisSync || then( e ));
            if ( patch ) {
                
                // TODO: Does this help at all? The point is to help
                // release no-longer-needed memory.
                leaf[ "lead" ] = null;
                
                if ( "clue" in patch )
                    leaf[ "clue" ] = patch[ "clue" ];
                leaf[ "leads" ] = my.arrMap( patch[ "leads" ] || [],
                    function ( lead, i ) {
                    
                    var leaf = { "lead": lead,
                        "path": path.concat( [ i ] ) };
                    // By pushing the branches to the end of the line,
                    // we're doing a breadth-first traversal. This
                    // could just as easily be .unshift() for a
                    // depth-first traversal.
                    leaves.push( leaf );
                    return leaf;
                } );
                leavesChecked = 0;
            } else {
                // However, this can't be .unshift() because then we'd
                // try the same dud leaf over and over.
                leaves.push( leaf );
                leavesChecked++;
            }
            if ( !thisSync )
                followDeclarationStep(
                    tree, leaves, leavesChecked, then, opt_sync );
        }, opt_sync ) )
            thisSync = false;
        if ( error )
            return then( error ), true;
    }
    return false;
}

my.leadEager = function ( patch ) {
    return function ( tree, path, opt_then, opt_sync ) {
        if ( !my.given( opt_then ) )
            return patch;
        opt_then( null, patch );
        return true;
    };
};

my.leadWithClues = function ( clues, nextLead ) {
    return my.arrFoldr( clues, nextLead, function ( clue, next ) {
        return my.leadEager( { "clue": clue, "leads": [ next ] } );
    } );
};

my.iterateDeclarations = function (
    tree, isBlocking, isInteresting, onInteresting, onUnknown ) {
    
    var nodes = [ { cluesSoFar: [], tree: tree } ];
    var results = [];
    while ( nodes.length ) {
        var node = nodes.shift();
        var hasClue = "clue" in node.tree;
        var clue = node.tree[ "clue" ];
        var action;
        if ( !node.tree[ "leads" ] )
            action = onUnknown( node.cluesSoFar, node.tree );
        else if ( hasClue && isBlocking( clue ) )
            action = [ "skip" ];
        else if ( hasClue && isInteresting( clue ) )
            action =
                onInteresting( node.cluesSoFar, clue, node.tree );
        else
            action = [ "recur" ];
        var op = action[ 0 ];
        if ( op === "skip" ) {
        } else if ( op === "recur" ) {
            recur( node );
        } else if ( op === "finish" ) {
            return results;
        } else if ( op === "acc-skip" ) {
            my.arrAddAll( results, action[ 1 ] );
        } else if ( op === "acc-recur" ) {
            my.arrAddAll( results, action[ 1 ] );
            recur( node );
        } else if ( op === "acc-finish" ) {
            my.arrAddAll( results, action[ 1 ] );
            return results;
        } else if ( op === "finish-with" ) {
            return action[ 1 ];
        } else {
            throw new Error();
        }
    }
    return results;
    
    function recur( node ) {
        var cluesSoFar = node.cluesSoFar.slice();
        if ( "clue" in node.tree )
            cluesSoFar.push( node.tree[ "clue" ] );
        nodes = my.arrMap( node.tree[ "leads" ], function ( lead ) {
            return { cluesSoFar: cluesSoFar, tree: lead };
        } ).concat( nodes );
    }
};


} );


(function ( topThis, topArgs, desperateEval, body ) {
    var root = (function () { return this; })() || topThis;
    var my = topArgs !== void 0 && typeof exports !== "undefined" ?
        exports : root.rocketnia.lathe;
    body( root, my, desperateEval );
})( this, typeof arguments === "undefined" ? void 0 : arguments,
    function () { return eval( arguments[ 0 ] ); },
    function ( root, my, desperateEval ) {


// ===== Eval-related utilities. =====================================
//
// We're putting these in a separate (function () { ... })(); block
// just in case.

// This implementation of my.globeval is inspired by
// <http://perfectionkills.com/global-eval-what-are-the-options/>.
my.globeval = eval;
try { var NaN = 0; NaN = my.globeval( "NaN" ); NaN === NaN && 0(); }
catch ( e )
    { my.globeval = function ( x ) { return root[ "eval" ]( x ); }; }
try { NaN = 0; NaN = my.globeval( "NaN" ); NaN === NaN && 0(); }
catch ( e ) { my.globeval = root[ "execScript" ]; }
// TODO: On Node.js, my.globeval is now undefined. Actually, Node.js
// probably has its own way of doing this:
// <http://nodejs.org/api/vm.html>. Use it.

// NOTE: This may execute things in a local scope, but it will always
// return a value.
my.almostGlobeval = my.globeval && my.globeval( "1" ) ? my.globeval :
    function ( expr ) { return desperateEval( expr ); };


my.funclet = function ( var_args ) {
    var code = [];
    var vals = [];
    my.arrEach( arguments, function ( arg, i ) {
        (i % 2 === 0 ? code : vals).push( arg );
    } );
    if ( code.length !== vals.length + 1 )
        throw new Error(
            "Can't funclet an even number of arguments." );
    return my.funcApply( null, Function.apply( null, code ), vals );
};

my.newapply = function ( Ctor, var_args ) {
    var args = my.arrUnbend( arguments, 1 );
    return my.funclet( "Ctor", Ctor, "args", args,
       "return new Ctor( " +
       my.arrMap( args,
           function ( it, i ) { return "args[ " + i + " ]"; } ) +
       " );" );
};

my.newcall = function ( Ctor, var_args ) {
    return my.newapply( Ctor, my.arrCut( arguments, 1 ) );
};


var KEYS = {
    enter: 13,
    up: 38,
    down: 40
};
var NO_CAPTURE = false;

function keyCode( event ) {
    return event.which ||
        event.keyCode;  // IE
}

function preventDefault( event ) {
    if ( event.preventDefault )
        event.preventDefault();
    else
        event.returnValue = false;  // IE
}

// TODO: See if this leaks memory with its treatment of DOM nodes.
my.blahrepl = function ( elem ) {
    
    // TODO: The rules we're using for navigating the command history
    // are idiosyncratic. Take a look at how other command prompts
    // behave, and see if we can improve upon our technique.
    var commandHistoryCounts = {};
    var commandHistory = [];
    var commandHistoryLimit = 10;
    function pushCommand( cmd ) {
        // Called directly when a command has been submitted. Called
        // indirectly when a modified command has been navigated away
        // from.
        
        // If the command is trivial, don't bother remembering it.
        if ( cmd === "" )
            return false;
        // If the command is identical to the previous one, don't
        // bother remembering it.
        if ( commandHistory.length !== 0 &&
            commandHistory[ commandHistory.length - 1 ] === cmd )
            return false;
        
        var safeKey = "|" + cmd;
        
        // Remember the command.
        commandHistoryCounts[ safeKey ] =
            (commandHistoryCounts[ safeKey ] || 0) + 1;
        commandHistory.push( cmd );
        
        // Prune away the next history entry, which will often be the
        // oldest due to our circular handling of history.
        //
        // TODO: See if we should keep track of another command list
        // that sorts commands by age, so that we can always remove
        // the oldest here.
        //
        if ( commandHistoryLimit < commandHistory.length ) {
            var safeAbandonedCmd = "|" + commandHistory.shift();
            if ( 0 == --commandHistoryCounts[ safeAbandonedCmd ] )
                delete commandHistoryCounts[ safeAbandonedCmd ];
        }
        return true;
    }
    function pushNewCommand( cmd ) {
        // Called when a command has been navigated away from.
        
        // If the command is modified, make a history entry for it.
        if ( commandHistoryCounts[ "|" + cmd ] === void 0 )
            return pushCommand( cmd );
        return false;
    }
    function replaceWithPrevious( cmd ) {
        // Called when navigating to the previous entry.
        
        // If there is no history yet, don't bother remembering this
        // command. Just leave it alone.
        if ( commandHistory.length === 0 )
            return cmd;
        
        // Rotate the history backward by one, while inserting this
        // command into the history if it's new. The command we rotate
        // past is the one we return.
        if ( pushNewCommand( cmd ) )
            commandHistory.unshift( commandHistory.pop() );
        var replacement;
        commandHistory.unshift( replacement = commandHistory.pop() );
        
        // Actually, if the replacement command is identical to the
        // one it's replacing, try rotating again. This makes a
        // difference when we navigate one way and then turn around.
        if ( replacement === cmd )
            commandHistory.unshift(
                replacement = commandHistory.pop() );
        
        return replacement;
    }
    function replaceWithNext( cmd ) {
        // Called when navigating to the previous entry.
        
        // If there is no history yet, don't bother remembering this
        // command. Just leave it alone.
        if ( commandHistory.length === 0 )
            return cmd;
        
        // Rotate the history forward by one, while inserting this
        // command into the history if it's new. The command we rotate
        // past is the one we return.
        pushNewCommand( cmd );
        var replacement;
        commandHistory.push( replacement = commandHistory.shift() );
        
        // Actually, if the replacement command is identical to the
        // one it's replacing, try rotating again. This makes a
        // difference when we navigate one way and then turn around.
        if ( replacement === cmd )
            commandHistory.push(
                replacement = commandHistory.shift() );
        
        return replacement;
    }
    
    var scrollback = my.dom( "textarea",
        { "class": "scrollback", "readonly": "readonly" } );
    var prompt = my.dom( "textarea", { "class": "prompt",
        "keydown": function ( event ) {
            var key = keyCode( event );
            if ( key === KEYS.enter
                || key === KEYS.up
                || key === KEYS.down )
                preventDefault( event );
        },
        "keyup": function ( event ) {
            var key = keyCode( event );
            if ( key === KEYS.enter )
                doEval();
            else if ( key === KEYS.up )
                doArrowUp();
            else if ( key === KEYS.down )
                doArrowDown();
        } } );
    
    my.appendDom( elem, scrollback, prompt,
        my.dom( "button", "Eval", { "class": "eval",
            "click": function ( event ) { doEval(); } } ) );
    
    var atStart = true;
    function doEval() {
        var command = prompt.value;
        
        if ( atStart )
            atStart = false;
        else
            scrollback.value += "\n\n";
        scrollback.value += ">>> " + command + "\n";
        scrollback.scrollTop = scrollback.scrollHeight;
        
        var success = false;
        try {
            var result = my.almostGlobeval( command );
            success = true;
        } catch ( e ) {
            var message = "(error rendering error)";
            try { message = "" + e; } catch ( e ) {}
            scrollback.value += "Error: " + message;
        }
        if ( success )
            scrollback.value += "--> " + result;
        
        scrollback.scrollTop = scrollback.scrollHeight;
        
        pushCommand( prompt.value );
        prompt.value = "";
    }
    function doArrowUp() {
        prompt.value = replaceWithPrevious( prompt.value );
    }
    function doArrowDown() {
        prompt.value = replaceWithNext( prompt.value );
    }
};


} );



return exports;
})();


// underreact-async.js

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


// TODO: Implement some useful resources (to go along with
// UselessResource and DispatcherResource). Namely, it would be nice
// to have a demand monitor, a clock, a mouse listener, and an HTML
// textarea display.
//
// TODO: Implement garbage collection for resources.
//
// TODO: Implement persistence for resources, and perhaps implement a
// localStorage resource to demonstrate it with.
//
// TODO: Reimplement resources in terms of makeLinkedSigPair objects
// instead of membranes.


"use strict";


function Map() {}
Map.prototype.init = function ( opts ) {
    this.keyHash_ = opts.keyHash;
    this.keyIsoAssumingHashIso_ = opts.keyIsoAssumingHashIso;
    this.contents_ = {};
    this.size_ = 0;
    return this;
};
Map.prototype.hash_ = function ( k ) {
    return "|" + this.keyHash_.call( {}, k );
};
Map.prototype.getEntry_ = function ( k ) {
    var self = this;
    var hash = self.hash_( k );
    var bin = self.contents_[ hash ];
    if ( !bin )
        return null;
    return _.arrAny( bin, function ( entry ) {
        return self.keyIsoAssumingHashIso_.call( {}, entry.key, k ) &&
            entry;
    } ) || null;
};
// TODO: See if we're actually going to use this.
Map.prototype.size = function () {
    return this.size_;
};
Map.prototype.has = function ( k ) {
    return !!this.getEntry_( k );
};
Map.prototype.getOr = function ( k, fallback ) {
    return (this.getEntry_( k ) || { val: fallback }).val;
};
Map.prototype.get = function ( k ) {
    return this.getOr( k, null );
};
Map.prototype.set = function ( k, v ) {
    var self = this;
    var hash = self.hash_( k );
    var bin = self.contents_[ hash ];
    if ( !bin )
        bin = self.contents_[ hash ] = [];
    var entry = _.arrAny( bin, function ( entry ) {
        return self.keyIsoAssumingHashIso_.call( {}, entry.key, k ) &&
            entry;
    } );
    if ( !entry ) {
        self.size_++;
        bin.push( entry = { key: k } );
    }
    entry.val = v;
};
Map.prototype.del = function ( k ) {
    var self = this;
    var hash = self.hash_( k );
    var bin = self.contents_[ hash ];
    if ( !bin )
        return;
    var hadIt = false;
    bin = self.contents_[ hash ] = _.arrRem( bin, function ( entry ) {
        var thisOne =
            self.keyIsoAssumingHashIso_.call( {}, entry.key, k );
        if ( thisOne )
            hadIt = true;
        return thisOne;
    } );
    if ( hadIt )
        self.size_--;
    if ( bin.length === 0 )
        delete self.contents_[ hash ];
};
Map.prototype.any = function ( test ) {
    return _.objOwnAny( this.contents_, function ( hash, entries ) {
        return _.arrAny( entries, function ( entry ) {
            return test( entry.key, entry.val );
        } );
    } );
};
Map.prototype.all = function ( test ) {
    return _.objOwnAll( this.contents_, function ( hash, entries ) {
        return _.arrAll( entries, function ( entry ) {
            return test( entry.key, entry.val );
        } );
    } );
};
Map.prototype.each = function ( body ) {
    this.any( function ( k, v ) {
        body( k, v );
        return false;
    } );
};
// NOTE: This passes in ( v, k ) instead of ( k, v ).
Map.prototype.map = function ( func ) {
    var result = new Map().init( {
        keyHash: this.keyHash_,
        keyIsoAssumingHashIso: this.keyIsoAssumingHashIso_
    } );
    this.each( function ( k, v ) {
        result.set( k, func( v, k ) );
    } );
    return result;
};
Map.prototype.copy = function () {
    return this.map( function ( v, k ) {
        return v;
    } );
};
Map.prototype.plus = function ( other ) {
    var result = this.copy();
    other.each( function ( k, v ) {
        result.set( k, v );
    } );
    return result;
};

function ElasticMap() {}
ElasticMap.prototype.init = function ( opts ) {
    this.contents_ = new Map().init( {
        keyHash: opts.keyHash,
        keyIsoAssumingHashIso: opts.keyIsoAssumingHashIso
    } );
    this.retractVal_ = opts.retractVal;
    this.makeVal_ = opts.makeVal;
    return this;
};
ElasticMap.prototype.asMap = function () {
    return this.contents_;
};
ElasticMap.prototype.getOrMake = function ( k, extraParam ) {
    if ( !this.contents_.has( k ) )
        this.contents_.set( k,
            this.makeVal_.call( {}, k, extraParam ) );
    return this.contents_.get( k );
};
ElasticMap.prototype.retract = function () {
    var self = this;
    var toDelete = [];
    var isEmpty = true;
    self.contents_.each( function ( k, v ) {
        if ( self.retractVal_.call( {}, v ) )
            toDelete.push( k );
        else
            isEmpty = false;
    } );
    _.arrEach( toDelete, function ( k ) {
        self.contents_.del( k );
    } );
    return isEmpty;
};

function arrMin( arr, func ) {
    return _.arrFoldl( 1 / 0, arr, function ( soFar, item ) {
        return Math.min( soFar, func( item ) );
    } );
}

function arrMax( arr, func ) {
    return _.arrFoldl( -1 / 0, arr, function ( soFar, item ) {
        return Math.max( soFar, func( item ) );
    } );
}

function isValidTime( x ) {
    return +x === x && 1 / x !== 0;
}

function isValidDuration( x ) {
    return +x === x && 1 / x !== 0;
}

function entEnd( entry ) {
    var maybeEndMillis = entry.maybeEndMillis;
    return maybeEndMillis === null ? 1 / 0 : maybeEndMillis.val;
}
function entsEnd( entries ) {
    return entEnd( entries[ entries.length - 1 ] );
}

function entDelay( delayMillis, entry ) {
    return {
        maybeData: entry.maybeData,
        startMillis: entry.startMillis + delayMillis,
        maybeEndMillis: entry.maybeEndMillis === null ? null :
            { val: entry.maybeEndMillis.val + delayMillis }
    };
}

function entsDelay( delayMillis, entry ) {
    return _.arrMap( entry, function ( entry ) {
        return entDelay( delayMillis, entry );
    } );
}

// TODO: See if we should support something other than nested Arrays
// of strings as data.
function isValidData( x ) {
    return recur( x );
    function recur( x ) {
        return _.isString( x ) ||
            (_.likeArray( x ) && _.arrAll( x, function ( elem ) {
                return recur( elem );
            } ));
    }
}
function dataHash( x ) {
    return JSON.stringify( x );
}
function dataIso( a, b ) {
    return _.jsonIso( a, b );
}
function dataIsoAssumingHashIso( a, b ) {
    return true;
}

// Log up to once every ten seconds.
//
// NOTE: We don't actually use this in this project, unless we're
// debugging.
//
var loggedLastMillis = null;
function sometimesLog( var_args ) {
    var nowMillis = new Date().getTime();
    if ( loggedLastMillis === null
        || loggedLastMillis < nowMillis - 10 * 1000 ) {
        
        loggedLastMillis = nowMillis;
        console.log.apply( console, arguments );
    }
}

var debugWarnings = [];


function ActivityHistory() {}
ActivityHistory.prototype.init = function ( opts ) {
    if ( !isValidTime( opts.startMillis ) )
        throw new Error();
    this.syncOnAdd_ = opts.syncOnAdd;
    if ( this.syncOnAdd_ === void 0 )
        this.syncOnAdd_ = function () {
            // Do nothing.
        };
    this.syncOnForget_ = opts.syncOnForget;
    if ( this.syncOnForget_ === void 0 )
        this.syncOnForget_ = function () {
            // Do nothing.
        };
    // NOTE: We always leave at least one entry in the history so that
    // it remains impossible to add entries that overwrite previous
    // results. This is the only reason we introduce a zero-length
    // entries like this one into the history.
    this.entries_ = [ { maybeData: null,
        startMillis: opts.startMillis,
        maybeEndMillis: { val: opts.startMillis } } ];
    return this;
};
ActivityHistory.prototype.forgetBeforeMillis = function (
    memoryStartMillis ) {
    
    // NOTE: The value of `memoryStartMillis` can be Infinity.
    
    var es = this.entries_;
    var maybeEndMillis = es[ es.length - 1 ].maybeEndMillis;
    var didSomething = false;
    while (
        es.length !== 0 && entEnd( es[ 0 ] ) < memoryStartMillis ) {
        
        didSomething = true;
        es.shift();
    }
    if ( !didSomething )
        return;
    if ( es.length === 0 )
        es.push( { maybeData: null,
            startMillis: maybeEndMillis.val,
            maybeEndMillis: maybeEndMillis } );
    this.syncOnForget_.call( {} );
};
ActivityHistory.prototype.getAllEntries = function () {
    // NOTE: If we return the same Array we mutate, then an observer
    // could merely check that Array every so often, rather than using
    // our painstakingly made listener-and-getter interface. How dare
    // they enjoy that kind of freedom! Let them eat copies.
    return this.entries_.slice();
};
ActivityHistory.prototype.getFirstEntry = function () {
    // NOTE: This is a convenience method for getAllEntries, but it
    // also avoids copying the Array.
    return this.entries_[ 0 ];
};
ActivityHistory.prototype.getLastEntry = function () {
    // NOTE: This is a convenience method for getAllEntries, but it
    // also avoids copying the Array.
    return this.entries_[ this.entries_.length - 1 ];
};
ActivityHistory.prototype.isEmpty = function () {
    // NOTE: This is a convenience method for getAllEntries, but it
    // also avoids copying the Array.
    return this.entries_[ 0 ].startMillis ===
        entEnd( this.entries_[ 0 ] );
};
ActivityHistory.prototype.addEntry = function ( newEntry ) {
    
    // NOTE: If the newEntry has a startMillis equal to its
    // maybeEndMillis.val, this will add inactivity up to that
    // instant, but it won't use the newEntry's data.
    
    var self = this;
    var startMillis = newEntry.startMillis;
    if ( !(true
        && (newEntry.maybeData === null
            || isValidData( newEntry.maybeData.val ))
        && isValidTime( startMillis )
        && (newEntry.maybeEndMillis === null
            || isValidTime( newEntry.maybeEndMillis.val ))
    ) )
        throw new Error();
    if ( newEntry.maybeData !== null
        && newEntry.maybeEndMillis === null )
        throw new Error();
    if ( entEnd( newEntry ) < startMillis )
        throw new Error();
    
    function maybeIso( a, b, innerIso ) {
        return (a === null && b === null) ||
            (a !== null && b !== null && innerIso( a.val, b.val ));
    }
    
    var lastEntry = self.entries_[ self.entries_.length - 1 ];
    if ( lastEntry.maybeEndMillis === null )
        return;
    if ( lastEntry.maybeEndMillis.val < startMillis ) {
        if ( lastEntry.maybeData === null ) {
            self.entries_.pop();
            lastEntry = { maybeData: null,
                startMillis: lastEntry.startMillis,
                maybeEndMillis: { val: startMillis } };
        } else {
            lastEntry = { maybeData: null,
                startMillis: lastEntry.maybeEndMillis.val,
                maybeEndMillis: { val: startMillis } };
        }
        self.entries_.push( lastEntry );
    } else {
        startMillis = lastEntry.maybeEndMillis.val;
    }
    if ( entEnd( newEntry ) <= startMillis )
        return;
    if ( maybeIso( newEntry.maybeData, lastEntry.maybeData,
        function ( a, b ) {
        
        return dataIso( a, b );
    } ) ) {
        startMillis = lastEntry.startMillis;
        self.entries_.pop();
    }
    self.entries_.push( { maybeData: newEntry.maybeData,
        startMillis: startMillis,
        maybeEndMillis: newEntry.maybeEndMillis } );
    self.syncOnAdd_.call( {} );
};
ActivityHistory.prototype.setData = function (
    data, startMillis, endMillis ) {
    
    this.addEntry( {
        maybeData: { val: data },
        startMillis: startMillis,
        maybeEndMillis: { val: endMillis }
    } );
};
ActivityHistory.prototype.suspendData = function (
    startMillis, endMillis ) {
    
    this.addEntry( {
        maybeData: null,
        startMillis: startMillis,
        maybeEndMillis: { val: endMillis }
    } );
};
ActivityHistory.prototype.finishData = function ( startMillis ) {
    this.addEntry( {
        maybeData: null,
        startMillis: startMillis,
        maybeEndMillis: null
    } );
};

function eachZipEnts( delayMillis, entsA, entsB, body ) {
    var startMillis =
        Math.min( entsA[ 0 ].startMillis, entsB[ 0 ].startMillis );
    var ai = 0, bi = 0;
    while ( true ) {
        while ( ai < entsA.length
            && entEnd( entsA[ ai ] ) + delayMillis <= startMillis )
            ai++;
        while ( bi < entsB.length
            && entEnd( entsB[ bi ] ) <= startMillis )
            bi++;
        
        if ( !(ai < entsA.length || bi < entsB.length) )
            break;
        
        var endA = 1 / 0;
        var maybeDataA = null;
        if ( ai < entsA.length ) {
            var entA = entsA[ ai ];
            if ( startMillis < entA.startMillis + delayMillis ) {
                endA = entA.startMillis;
            } else {
                endA = entEnd( entA );
                maybeDataA = entA.maybeData;
            }
        }
        var endB = 1 / 0;
        var maybeDataB = null;
        if ( bi < entsB.length ) {
            var entB = entsB[ bi ];
            if ( startMillis < entB.startMillis ) {
                endB = entB.startMillis;
            } else {
                endB = entEnd( entB );
                maybeDataB = entB.maybeData;
            }
        }
        
        var endMillis = Math.min( endA + delayMillis, endB );
        body( maybeDataA, maybeDataB, startMillis, endMillis );
        startMillis = endMillis;
    }
}

function visualizeHistoriesOnCanvas( histories, opt_opts ) {
    var opts = _.opt( opt_opts ).or( {
        width: 500,
        rowHeight: 10,
        spacerHeight: 1,
        infinityPadMillis: 1000
    } ).bam();
    histories = _.arrMap( histories, function ( ents ) {
        return ents instanceof ActivityHistory ?
            ents.getAllEntries() : ents;
    } );
    
    function paddedEntEnd( entry ) {
        return entry.maybeEndMillis === null ?
            entry.startMillis + opts.infinityPadMillis :
            entry.maybeEndMillis.val;
    }
    var startMillis = arrMin( histories, function ( ents ) {
        return arrMin( ents, function ( entry ) {
            return entry.startMillis;
        } );
    } );
    var endMillis = -arrMin( histories, function ( ents ) {
        return arrMin( ents, function ( entry ) {
            return -paddedEntEnd( entry );
        } );
    } );
    if ( startMillis === 1 / 0 || endMillis === -1 / 0 )
        throw new Error();
    function millisToX( millis ) {
        return opts.width *
            (millis - startMillis) / (endMillis - startMillis);
    }
    
    var fullHeight = histories.length * opts.rowHeight +
        (histories.length - 1) * opts.spacerHeight;
    var canvas = _.dom( "canvas",
        { width: "" + opts.width, height: "" + fullHeight } );
    var ctx = canvas.getContext( "2d" );
    ctx.fillStyle = "#FFFFCC";
    ctx.fillRect( 0, 0, opts.width, fullHeight );
    _.arrEach( histories, function ( ents, i ) {
        _.arrEach( ents, function ( entry ) {
            if ( entry.maybeEndMillis === null ) {
                ctx.fillStyle = "#CCFFCC";
            } else if ( entry.maybeData === null ) {
                ctx.fillStyle = "#CCCCFF";
            } else {
                ctx.fillStyle = "#000033";
            }
            var startX = millisToX( entry.startMillis );
            ctx.fillRect(
                startX,
                i * opts.rowHeight + i * opts.spacerHeight,
                millisToX( paddedEntEnd( entry ) ) - startX,
                opts.rowHeight
            );
        } );
        ctx.fillStyle = "#000000";
        ctx.fillRect(
            0, (i + 1) * opts.rowHeight + i * opts.spacerHeight,
            opts.width, opts.spacerHeight );
    } );
    return canvas;
}

// This creates a managed glue layer around a two-way channel which
// uses messages of this form:
//
// {
//     permanentUntilMillis: <timestamp>,
//     demands: <Array of> {
//         delayMillis: <duration from now to response>,
//         demandDataHistory: <history entries of> <data>
//     },
//     responses: <map-like Array of> {
//         // key
//         delayMillis: <duration from demand to now>,
//         demandData: <data>,
//
//         // value
//         responseDataHistory: <history entries of> <data>
//     }
// }
//
// The responseDataHistory should never go on forever, so that the
// receiver can garbage-collect it once it's old enough.
//
function MessageMembrane() {}
MessageMembrane.prototype.init = function (
    outPermanentUntilMillis, deferForBatching, sendMessage,
    syncOnInDemandAvailable, opt_debugInfo ) {
    
    if ( !isValidTime( outPermanentUntilMillis ) )
        throw new Error();
    
    var self = this;
    self.deferForBatching_ = deferForBatching;
    self.sendMessage_ = sendMessage;
    self.sendingMessage_ = false;
    self.outDemanders_ = [];
    self.otherOutPermanentUntilMillis_ = outPermanentUntilMillis;
    self.inResponseIgnoranceMillis_ = outPermanentUntilMillis;
    // NOTE: This can be -Infinity at first, but we'll quickly bump it
    // up to be at least outPermanentUntilMillis.
    self.sentOutPermanentUntilMillis_ = -1 / 0;
    self.inPermanentUntilMillis_ = outPermanentUntilMillis;
    self.inDemands_ = [];
    self.syncOnInDemandAvailable_ = syncOnInDemandAvailable;
    
    self.outResponsesByDelayAndInput_ = new ElasticMap().init( {
        keyHash: function ( delayMillis ) {
            return "" + delayMillis;
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return true;
        },
        retractVal: function ( outResponsesByInput ) {
            return outResponsesByInput.retract();
        },
        makeVal: function ( delayMillis, extraParam ) {
            return new ElasticMap().init( {
                keyHash: function ( inputData ) {
                    return dataHash( inputData );
                },
                keyIsoAssumingHashIso: function ( a, b ) {
                    return dataIsoAssumingHashIso( a, b );
                },
                retractVal: function ( history ) {
                    // NOTE: The end can't be Infinity here, because
                    // we don't allow responses to end.
                    return entsEnd( history.getAllEntries() ) <=
                        self.otherOutPermanentUntilMillis_;
                },
                makeVal: function ( inputData, startMillis ) {
                    return new ActivityHistory().init( {
                        startMillis: startMillis
                    } );
                }
            } );
        }
    } );
    
    self.inResponsesByDelayAndInput_ = new ElasticMap().init( {
        keyHash: function ( delayMillis ) {
            return "" + delayMillis;
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return true;
        },
        retractVal: function ( inResponsesByInput ) {
            return inResponsesByInput.retract();
        },
        makeVal: function ( delayMillis, extraParam ) {
            return new ElasticMap().init( {
                keyHash: function ( inputData ) {
                    return dataHash( inputData );
                },
                keyIsoAssumingHashIso: function ( a, b ) {
                    return dataIsoAssumingHashIso( a, b );
                },
                retractVal: function ( history ) {
                    // NOTE: The end can't be Infinity here, because
                    // we don't allow responses to end.
                    return entsEnd( history.getAllEntries() ) <=
                        self.inResponseIgnoranceMillis_;
                },
                makeVal: function ( inputData, startMillis ) {
                    var history;
                    return history = new ActivityHistory().init( {
                        startMillis: startMillis,
                        syncOnAdd: function () {
                            onAddInResponse(
                                delayMillis, inputData, history );
                        }
                    } );
                }
            } );
        }
    } );
    
    function onAddInResponse( delayMillis, inputData, history ) {
        var myEntries = history.getAllEntries();
        var myEndMillis = entsEnd( myEntries );
        _.arrEach( self.outDemanders_, function ( od ) {
            
            // Update this out-demander with whatever new history
            // entries it's missing.
            
            if ( od.getDelayMillis() !== delayMillis )
                return;
            var demandEntries = od.getDemandHistoryEntries();
            var demandEndMillis = entsEnd( demandEntries );
            var localResponseEndMillis =
                entsEnd( od.getResponseHistoryEntries() );
            eachZipEnts( delayMillis, demandEntries, myEntries,
                function ( maybeDemandData, maybeMyResponseData,
                    startMillis, endMillis ) {
                
                // If this is part of the already-processed response,
                // we haven't started yet.
                if ( endMillis <= localResponseEndMillis )
                    return;
                
                // If the response is overtaking the demand, we're
                // done.
                if ( demandEndMillis <= startMillis )
                    return;
                
                // If the demand is overtaking the response, we're
                // done.
                if ( myEndMillis <= startMillis )
                    return;
                
                var maybeEndMillis =
                    endMillis === 1 / 0 ? null : { val: endMillis };
                var maybeLocalResponseData = null;
                if ( maybeDemandData !== null
                    && dataIso( maybeDemandData.val, inputData ) ) {
                    
                    // NOTE: This is a sanity check to make sure the
                    // membrane obeys duration coupling for demand
                    // responses.
                    if ( maybeMyResponseData === null ) {
                        var offendingInterval = [ {
                            maybeData: { val: [] },
                            startMillis: startMillis,
                            maybeEndMillis: { val: endMillis }
                        } ];
                        var delayedDemandEntries =
                            entsDelay( delayMillis, demandEntries );
                        // TODO: See if we can set up a debug
                        // configuration that makes sense for this.
                        var debugWarningsIndex = debugWarnings.length;
                        debugWarnings.push( {
                            debugInfo: opt_debugInfo,
                            offendingInterval: offendingInterval,
                            demandEntries: demandEntries,
                            delayedDemandEntries:
                                delayedDemandEntries,
                            myEntries: myEntries,
                            canvas: _.dom( "p",
                                visualizeHistoriesOnCanvas( [
                                    offendingInterval,
                                    delayedDemandEntries,
                                    myEntries
                                ] ) )
                        } );
                        // TODO: See if we can set up a debug
                        // configuration that makes sense for this.
                        console.log(
                            "Warning: A membrane neglected to " +
                            "respond to all its demand. See " +
                            "debugWarnings[ " +
                                debugWarningsIndex + " ]. " +
                            JSON.stringify( opt_debugInfo === void 0 ?
                                null : opt_debugInfo ) + "." );
                    }
                    
                    maybeLocalResponseData = { val: [
                        maybeDemandData.val
                    ].concat(
                        maybeMyResponseData === null ? [] :
                            [ maybeMyResponseData.val ]
                    ) };
                }
                
                od.addResponseHistoryEntry( {
                    maybeData: maybeLocalResponseData,
                    startMillis: startMillis,
                    maybeEndMillis: maybeEndMillis
                } );
            } );
        } );
        self.scrapOutDemanders_();
    }
    
    self.triggerSendMessage_();
    
    return self;
};
MessageMembrane.prototype.updateInResponseIgnoranceMillis_ =
    function () {
    
    var self = this;
    self.inResponseIgnoranceMillis_ =
        self.otherOutPermanentUntilMillis_;
    _.arrEach( self.outDemanders_, function ( od ) {
        self.inResponseIgnoranceMillis_ = Math.min(
            self.inResponseIgnoranceMillis_,
            od.getResponseHistoryEntries()[ 0 ].startMillis
        );
    } );
};
MessageMembrane.prototype.scrapOutDemanders_ = function () {
    this.outDemanders_ =
        _.arrKeep( this.outDemanders_, function ( od ) {
            return !od.isScrappable();
        } );
    this.updateInResponseIgnoranceMillis_();
};
MessageMembrane.prototype.makeOutResponsesHistory_ = function (
    delayMillis, inputData, startMillis ) {
    
    return this.outResponsesByDelayAndInput_.
        getOrMake( delayMillis, null ).
        getOrMake( inputData, startMillis );
};
MessageMembrane.prototype.makeInResponsesHistory_ = function (
    delayMillis, inputData, startMillis ) {
    
    return this.inResponsesByDelayAndInput_.
        getOrMake( delayMillis, null ).
        getOrMake( inputData, startMillis );
};
MessageMembrane.prototype.triggerSendMessage_ = function () {
    var self = this;
    if ( self.sendingMessage_ )
        return;
    self.sendingMessage_ = true;
    self.deferForBatching_.call( {}, function () {
        self.sendingMessage_ = false;
        
        var outPermanentUntilMillis =
            self.otherOutPermanentUntilMillis_;
        var demandHistory = _.acc( function ( y ) {
            _.arrEach( self.outDemanders_, function ( od ) {
                var ents = od.readDemandHistoryEntries();
                if ( ents === null )
                    return;
                y( {
                    delayMillis: od.getDelayMillis(),
                    demandDataHistory: ents
                } );
                outPermanentUntilMillis = Math.min(
                    outPermanentUntilMillis, entsEnd( ents ) );
            } );
            self.scrapOutDemanders_();
        } );
        var responses = _.acc( function ( y ) {
            self.outResponsesByDelayAndInput_.asMap().each(
                function ( delayMillis, outResponsesByInput ) {
                
                outResponsesByInput.asMap().each(
                    function ( inputData, history ) {
                    
                    var ents = history.getAllEntries();
                    // NOTE: The end can't be Infinity here, because
                    // we don't allow responses to end.
                    history.forgetBeforeMillis( entsEnd( ents ) );
                    y( {
                        delayMillis: delayMillis,
                        inputData: inputData,
                        responseDataHistory: ents
                    } );
                } );
            } );
            self.outResponsesByDelayAndInput_.retract();
        } );
        if ( self.sentOutPermanentUntilMillis_ ===
                outPermanentUntilMillis
            && demandHistory.length === 0
            && responses.length === 0 )
            return;
        self.sentOutPermanentUntilMillis_ = outPermanentUntilMillis;
        self.sendMessage_.call( {}, {
            permanentUntilMillis: outPermanentUntilMillis,
            demands: demandHistory,
            responses: responses
        } );
    } );
};
MessageMembrane.prototype.receiveMessage = function ( message ) {
    // TODO: Validate this message.
    
    var self = this;
    
    var oldInPermanentUntilMillis = self.inPermanentUntilMillis_;
    
    _.arrEach( message.demands, function ( demand ) {
        var history = new ActivityHistory().init( {
            startMillis: oldInPermanentUntilMillis
        } );
        _.arrEach( demand.demandDataHistory, function ( entry ) {
            history.addEntry( entry );
        } );
        self.inDemands_.push( {
            delayMillis: demand.delayMillis,
            demandDataHistory: history
        } );
    } );
    
    // TODO: This triggers syncOnAdd multiple times. See if that's
    // appropriate.
    _.arrEach( message.responses, function ( response ) {
        var entries = response.responseDataHistory;
        if ( entries.length === 0 )
            return;
        var history = self.makeInResponsesHistory_(
            response.delayMillis,
            response.inputData,
            oldInPermanentUntilMillis
        );
        _.arrEach( entries, function ( entry ) {
            history.addEntry( entry );
        } );
    } );
    
    if ( self.inPermanentUntilMillis_ < message.permanentUntilMillis
        ) {
        
        self.inPermanentUntilMillis_ = message.permanentUntilMillis;
        self.inResponsesByDelayAndInput_.asMap().each(
            function ( delayMillis, inResponsesByInput ) {
            
            inResponsesByInput.asMap().each(
                function ( inputData, history ) {
                
                history.suspendData( message.permanentUntilMillis,
                    message.permanentUntilMillis );
            } );
        } );
    }
    
    // Just in case we don't actually have any out-demanders right
    // now, clean up the in-responses.
    self.forgetInResponses_();
    
    if ( message.demands.length !== 0 )
        self.syncOnInDemandAvailable_.call( {} );
};
MessageMembrane.prototype.getInPermanentUntilMillis = function () {
    return this.inPermanentUntilMillis_;
};
MessageMembrane.prototype.getInDemandHistoryEntries = function () {
    // Defensively clone the Arrays.
    return _.arrMap( this.inDemands_, function ( demand ) {
        return {
            delayMillis: demand.delayMillis,
            demandDataHistory:
                demand.demandDataHistory.getAllEntries()
        };
    } );
};
// TODO: See if we can combine the code for
// forgetInDemandBeforeDemandMillis and
// forgetInDemandBeforeResponseMillis. Also, see if we're actually
// going to use forgetInDemandBeforeResponseMillis at some point.
MessageMembrane.prototype.forgetInDemandBeforeDemandMillis =
    function ( demandMillis ) {
    
    var actualForgetDemandMillis =
        Math.min( demandMillis, this.inPermanentUntilMillis_ );
    
    this.inDemands_ = _.arrMappend( this.inDemands_,
        function ( demand ) {
        
        if ( entsEnd( demand.demandDataHistory.getAllEntries() ) <=
            actualForgetDemandMillis )
            return [];
        demand.demandDataHistory.forgetBeforeMillis(
            actualForgetDemandMillis );
        return [ { delayMillis: demand.delayMillis,
            demandDataHistory: demand.demandDataHistory } ];
    } );
};
MessageMembrane.prototype.forgetInDemandBeforeResponseMillis =
    function ( responseMillis ) {
    
    var actualForgetResponseMillis =
        Math.min( responseMillis, this.inPermanentUntilMillis_ );
    
    this.inDemands_ = _.arrMappend( this.inDemands_,
        function ( demand ) {
        
        var actualForgetDemandMillis =
            actualForgetResponseMillis - demand.delayMillis;
        if ( entsEnd( demand.demandDataHistory.getAllEntries() ) <=
            actualForgetDemandMillis )
            return [];
        demand.demandDataHistory.forgetBeforeMillis(
            actualForgetDemandMillis );
        return [ { delayMillis: demand.delayMillis,
            demandDataHistory: demand.demandDataHistory } ];
    } );
};
MessageMembrane.prototype.raiseOtherOutPermanentUntilMillis =
    function ( otherOutPermanentUntilMillis ) {
    
    var self = this;
    
    if ( !isValidTime( otherOutPermanentUntilMillis ) )
        throw new Error();
    if ( otherOutPermanentUntilMillis <=
        self.otherOutPermanentUntilMillis_ )
        return;
    
    self.otherOutPermanentUntilMillis_ = otherOutPermanentUntilMillis;
    self.updateInResponseIgnoranceMillis_();
    self.outResponsesByDelayAndInput_.asMap().each(
        function ( delayKey, outResponsesByInput ) {
        
        outResponsesByInput.asMap().each(
            function ( inputKey, history ) {
            
            history.suspendData( otherOutPermanentUntilMillis,
                otherOutPermanentUntilMillis );
        } );
    } );
    self.triggerSendMessage_();
};
// NOTE: Unlike an out-demander's {set,suspend,finish}Demand methods
// and an ActivityHistory's {set,suspend,finish}Data methods, there is
// no corresponding finishOutResponse here to complete the set. That's
// because a finished out-response could never be garbage-collected,
// but an outdated one can.
MessageMembrane.prototype.setOutResponse = function (
    delayMillis, inDemandData,
    outResponseData, startMillis, endMillis ) {
    
    this.makeOutResponsesHistory_(
        delayMillis, inDemandData, this.otherOutPermanentUntilMillis_
    ).setData( outResponseData, startMillis, endMillis );
    this.triggerSendMessage_();
};
MessageMembrane.prototype.suspendOutResponse = function (
    delayMillis, inDemandData, startMillis, endMillis ) {
    
    this.makeOutResponsesHistory_(
        delayMillis, inDemandData, this.otherOutPermanentUntilMillis_
    ).suspendData( startMillis, endMillis );
    this.triggerSendMessage_();
};
MessageMembrane.prototype.forgetInResponses_ = function () {
    var self = this;
    self.inResponsesByDelayAndInput_.asMap().each(
        function ( delayMillis, inResponsesByInput ) {
        
        inResponsesByInput.asMap().each(
            function ( inputData, history ) {
            
            history.forgetBeforeMillis(
                self.inResponseIgnoranceMillis_ );
        } );
    } );
};
MessageMembrane.prototype.getNewOutDemander = function (
    outPermanentUntilMillis, delayMillis, syncOnResponseAvailable ) {
    
    var self = this;
    
    if ( !(isValidTime( outPermanentUntilMillis )
        && isValidDuration( delayMillis )) )
        throw new Error();
    
    var actualOutPermanentUntilMillis = Math.max(
        outPermanentUntilMillis, self.otherOutPermanentUntilMillis_ );
    
    var demandHistory = new ActivityHistory().init( {
        startMillis: actualOutPermanentUntilMillis,
        syncOnAdd: function () {
            self.triggerSendMessage_();
        }
    } );
    var responseHistory = new ActivityHistory().init( {
        startMillis: actualOutPermanentUntilMillis + delayMillis,
        syncOnAdd: function () {
            syncOnResponseAvailable();
        },
        syncOnForget: function () {
            self.updateInResponseIgnoranceMillis_();
            self.forgetInResponses_();
        }
    } );
    
    var maybeUnsentStartMillis =
        { val: actualOutPermanentUntilMillis };
    
    function forgetResponseBeforeResponseMillis( responseMillis ) {
        responseHistory.forgetBeforeMillis( responseMillis );
        demandHistory.forgetBeforeMillis( Math.min(
            maybeUnsentStartMillis === null ?
                1 / 0 : maybeUnsentStartMillis.val,
            responseMillis - delayMillis,
            responseHistory.getAllEntries()[ 0 ].startMillis -
                delayMillis
        ) );
    }
    
    var backstage = {};
    backstage.getDelayMillis = function () {
        return delayMillis;
    };
    backstage.getDemandHistoryEntries = function () {
        return demandHistory.getAllEntries();
    };
    backstage.readDemandHistoryEntries = function () {
        if ( maybeUnsentStartMillis === null )
            return null;
        var result = demandHistory.getAllEntries().slice();
        // TODO: See if this can be more efficient.
        while ( result[ 0 ].maybeEndMillis !== null
            && result[ 0 ].maybeEndMillis.val <
                maybeUnsentStartMillis.val )
            result.shift();
        maybeUnsentStartMillis =
            result[ result.length - 1 ].maybeEndMillis;
        return result;
    };
    backstage.isScrappable = function () {
        if ( maybeUnsentStartMillis !== null )
            return false;
        var ents = demandHistory.getAllEntries();
        // Return whether we've had responses up to at least the
        // starting point of our eternal inactivity.
        return ents[ ents.length - 1 ].startMillis + delayMillis <=
            entsEnd( responseHistory.getAllEntries() );
    };
    backstage.getResponseHistoryEntries = function () {
        return responseHistory.getAllEntries();
    };
    backstage.addResponseHistoryEntry = function ( historyEntry ) {
        responseHistory.addEntry( historyEntry );
    };
    self.outDemanders_.push( backstage );
    
    responseHistory.addEntry( {
        maybeData: null,
        startMillis: self.inPermanentUntilMillis_,
        maybeEndMillis: { val: self.inPermanentUntilMillis_ }
    } );
    
    var frontstage = {};
    frontstage.getResponseHistoryEntries = function () {
        return responseHistory.getAllEntries();
    };
    frontstage.forgetResponseBeforeDemandMillis = function (
        demandMillis ) {
        
        forgetResponseBeforeResponseMillis(
            demandMillis + delayMillis );
    };
    frontstage.forgetResponseBeforeResponseMillis = function (
        responseMillis ) {
        
        forgetResponseBeforeResponseMillis( responseMillis );
    };
    frontstage.setDemand = function ( data, startMillis, endMillis ) {
        demandHistory.setData( data, startMillis, endMillis );
    };
    frontstage.suspendDemand = function ( startMillis, endMillis ) {
        demandHistory.suspendData( startMillis, endMillis );
    };
    frontstage.finishDemand = function ( startMillis ) {
        demandHistory.finishData( startMillis );
    };
    return frontstage;
};


// Here's the entire MessageMembrane interface, for reference:
//
// MessageMembrane.prototype.init = function (
//     outPermanentUntilMillis, deferForBatching, sendMessage,
//     syncOnInDemandAvailable, opt_debugInfo )
// MessageMembrane.prototype.receiveMessage = function ( message )
// MessageMembrane.prototype.getInPermanentUntilMillis = function ()
// MessageMembrane.prototype.getInDemandHistoryEntries = function ()
// MessageMembrane.prototype.forgetInDemandBeforeResponseMillis =
//     function ( responseMillis )
// MessageMembrane.prototype.raiseOtherOutPermanentUntilMillis =
//     function ( otherOutPermanentUntilMillis )
// MessageMembrane.prototype.setOutResponse = function (
//     delayMillis, inDemandData,
//     outResponseData, startMillis, endMillis )
// MessageMembrane.prototype.suspendOutResponse = function (
//     delayMillis, inDemandData, startMillis, endMillis )
// MessageMembrane.prototype.getNewOutDemander = function (
//     outPermanentUntilMillis, delayMillis, syncOnResponseAvailable
//     ) {
//     
//     var frontstage = {};
//     frontstage.getResponseHistoryEntries = function ()
//     frontstage.forgetResponseBeforeDemandMillis = function (
//         demandMillis )
//     frontstage.forgetResponseBeforeResponseMillis = function (
//         responseMillis )
//     frontstage.setDemand = function (
//         data, startMillis, endMillis )
//     frontstage.suspendDemand = function ( startMillis, endMillis )
//     frontstage.finishDemand = function ( startMillis )
//     return frontstage;
// };


function makeLinkedMembranePair(
    outPermanentUntilMillis, deferForBatching, opt_debugInfo ) {
    
    var aListeners = [];
    var aMembrane = new MessageMembrane().init(
        outPermanentUntilMillis,
        deferForBatching,
        function ( message ) {  // sendMessage
            bMembrane.receiveMessage( message );
        },
        function () {  // syncOnInDemandAvailable
            _.arrEach( aListeners, function ( listener ) {
                listener();
            } );
        },
        {
            type: "makeLinkedMembranePair a",
            orig: opt_debugInfo === void 0 ? null : opt_debugInfo
        }
    );
    
    var bListeners = [];
    var bMembrane = new MessageMembrane().init(
        outPermanentUntilMillis,
        deferForBatching,
        function ( message ) {  // sendMessage
            aMembrane.receiveMessage( message );
        },
        function () {  // syncOnInDemandAvailable
            _.arrEach( bListeners, function ( listener ) {
                listener();
            } );
        },
        {
            type: "makeLinkedMembranePair b",
            orig: opt_debugInfo === void 0 ? null : opt_debugInfo
        }
    );
    
    return {
        a: {
            membrane: aMembrane,
            syncOnInDemandAvailable: function ( listener ) {
                aListeners.push( listener );
            }
        },
        b: {
            membrane: bMembrane,
            syncOnInDemandAvailable: function ( listener ) {
                bListeners.push( listener );
            }
        }
    };
}

function makeLinkedSigPair( startMillis ) {
    
    var listeners = [];
    var history = new ActivityHistory().init( {
        startMillis: startMillis,
        syncOnAdd: function () {
            _.arrEach( listeners, function ( listener ) {
                listener();
            } );
        }
    } );
    
    
    var readable = {};
    readable.syncOnAdd = function ( listener ) {
        listeners.push( listener );
    };
    readable.readEachEntry = function ( processEntry ) {
        // NOTE: This is a convenience method.
        // NOTE: This may yield entries that overlap with each other.
        readable.syncOnAdd( function () {
            var entries = readable.history.getAllEntries();
            readable.history.forgetBeforeMillis( entsEnd( entries ) );
            _.arrEach( entries, function ( entry ) {
                processEntry( entry );
            } );
        } );
    };
    readable.history = history;
    
    var writable = {};
    writable.history = history;
    
    return { readable: readable, writable: writable };
}

function getAndForgetDemanderResponse( demander ) {
    var responseEntries = demander.getResponseHistoryEntries();
    var responseEndMillis = entsEnd( responseEntries );
    demander.forgetResponseBeforeResponseMillis(
        responseEndMillis === 1 / 0 ?
            responseEntries[
                responseEntries.length - 1 ].startMillis :
            responseEndMillis );
    return responseEntries;
}

function explicitlyIgnoreMembraneDemand(
    membrane, opt_backlogMillis ) {
    
    _.arrEach( membrane.getInDemandHistoryEntries(),
        function ( demand ) {
        
        var delayMillis = demand.delayMillis;
        _.arrEach( demand.demandDataHistory, function ( entry ) {
            if ( entry.maybeData === null )
                return;
            var data = entry.maybeData.val;
            
            // Respond with a dummy value.
            membrane.setOutResponse( delayMillis, data, [],
                entry.startMillis + delayMillis,
                entry.maybeEndMillis.val + delayMillis );
        } );
    } );
    membrane.forgetInDemandBeforeDemandMillis( Math.min(
        membrane.getInPermanentUntilMillis(),
        opt_backlogMillis === void 0 ? 1 / 0 : opt_backlogMillis
    ) );
}

// TODO: See if we're ever going to use this, now that we have
// behMouseQuery(). Currently we use this to test, and in the future
// it might come in handy for modeling this effect as a resource.
function connectMouseQuery( pairHalf ) {
    var mousePosition = JSON.stringify( null );
    _.appendDom( window, { mousemove: function ( e ) {
        mousePosition = JSON.stringify( [ e.clientX, e.clientY ] );
    } } );
    var responsesToGive = [];
    var demandPermanentUntilMillis = -1 / 0;
    pairHalf.syncOnInDemandAvailable( function () {
        var nowMillis = new Date().getTime();
        demandPermanentUntilMillis =
            pairHalf.membrane.getInPermanentUntilMillis();
        _.arrEach( pairHalf.membrane.getInDemandHistoryEntries(),
            function ( demand ) {
            
            var delayMillis = demand.delayMillis;
            _.arrEach( demand.demandDataHistory, function ( entry ) {
                if ( entry.maybeData === null )
                    return;
                var data = entry.maybeData.val;
                var json = void 0;
                
                if ( _.isString( data ) )
                    try { json = JSON.parse( data ); } catch ( e ) {}
                
                if ( true
                    && _.isNumber( json )
                    && json === ~~json
                    && 1 / json !== -1 / 0
                ) {
                    responsesToGive.push( {
                        delayMillis: delayMillis,
                        demandData: data,
                        postMeasurementDelayMillis:
                            delayMillis - json,
                        responseStartMillis:
                            entry.startMillis + delayMillis,
                        responseEndMillis:
                            entry.maybeEndMillis.val + delayMillis
                    } );
                } else {
                    // We don't recognize this message. Respond with a
                    // dummy value.
                    pairHalf.membrane.setOutResponse(
                        delayMillis,
                        data,
                        [],
                        entry.startMillis + delayMillis,
                        entry.maybeEndMillis.val + delayMillis );
                }
            } );
        } );
        pairHalf.membrane.forgetInDemandBeforeDemandMillis(
            Math.min( demandPermanentUntilMillis, nowMillis ) );
    } );
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 100;  // 10;
    var stabilityMillis = 500;  // 200;
    setInterval( function () {
        var measurementStartMillis = new Date().getTime();
        var measurementEndMillis =
            measurementStartMillis + stabilityMillis;
        
        var forLater = [];
        var forRightNow = [];
        _.arrEach( responsesToGive, function ( rtg ) {
            var pmdm = rtg.postMeasurementDelayMillis;
            
            // If we need to give a response before this measurement,
            // give a blank one.
            if ( rtg.responseStartMillis <
                measurementStartMillis + pmdm )
                forRightNow.push( {
                    startMillis: rtg.responseStartMillis,
                    go: function () {
                        pairHalf.membrane.setOutResponse(
                            rtg.delayMillis,
                            rtg.demandData,
                            JSON.stringify( null ),
                            rtg.responseStartMillis,
                            Math.min( measurementStartMillis + pmdm,
                                rtg.responseEndMillis ) );
                    }
                } );
            
            // If we need to give a response during this measurement,
            // give the value of this measurement.
            var thisResponseStartMillis =
                Math.max( measurementStartMillis + pmdm,
                    rtg.responseStartMillis );
            var thisResponseEndMillis =
                Math.min( measurementEndMillis + pmdm,
                    rtg.responseEndMillis );
            if ( thisResponseStartMillis < thisResponseEndMillis )
                forRightNow.push( {
                    startMillis: thisResponseStartMillis,
                    go: function () {
                        pairHalf.membrane.setOutResponse(
                            rtg.delayMillis,
                            rtg.demandData,
                            mousePosition,
                            thisResponseStartMillis,
                            thisResponseEndMillis );
                    }
                } );
            
            // If we need to give a response after this measurement,
            // put that off until later.
            if ( measurementEndMillis + pmdm < rtg.responseEndMillis )
                forLater.push( {
                    delayMillis: rtg.delayMillis,
                    demandData: rtg.demandData,
                    postMeasurementDelayMillis:
                        rtg.postMeasurementDelayMillis,
                    responseStartMillis:
                        Math.max( measurementEndMillis + pmdm,
                            rtg.responseStartMillis ),
                    responseEndMillis: rtg.responseEndMillis
                } );
        } );
        _.arrEach( forRightNow.sort( function ( a, b ) {
            return a.startMillis - b.startMillis;
        } ), function ( frn ) {
            frn.go();
        } );
        responsesToGive = forLater;
        
        if ( demandPermanentUntilMillis !== -1 / 0 )
            pairHalf.membrane.raiseOtherOutPermanentUntilMillis(
                Math.min( demandPermanentUntilMillis,
                    measurementEndMillis ) );
    }, intervalMillis );
}

function promoteDemanderResponseToOutResponse(
    delayMillis, demander, membrane ) {
    
    _.arrEach( getAndForgetDemanderResponse( demander ),
        function ( entry ) {
        
        if ( entry.maybeData === null )
            ;  // Do nothing.
        else if ( entry.maybeData.val.length === 1 )
            membrane.suspendOutResponse(
                delayMillis,
                entry.maybeData.val[ 0 ],
                entry.startMillis,
                entry.maybeEndMillis.val );
        else
            membrane.setOutResponse(
                delayMillis,
                entry.maybeData.val[ 0 ],
                entry.maybeData.val[ 1 ],
                entry.startMillis,
                entry.maybeEndMillis.val );
    } );
}


// TODO: See if we actually want to model resources in terms of
// MessageMembranes like this.
function UselessResource() {}
UselessResource.prototype.init = function (
    outPermanentUntilMillis, deferForBatching, sendMessage ) {
    
    var self = this;
    
    // TODO: See if we should pass some kind of debugInfo to this
    // MessageMembrane.
    self.clientMembrane_ = new MessageMembrane().init(
        outPermanentUntilMillis, deferForBatching, sendMessage,
        function () {  // syncOnInDemandAvailable
            
            var demandEntries =
                self.clientMembrane_.getInDemandHistoryEntries();
            
            _.arrEach( demandEntries, function ( demand ) {
                var delayMillis = demand.delayMillis;
                _.arrEach( demand.demandDataHistory,
                    function ( entry ) {
                    
                    if ( entry.maybeData === null )
                        return;
                    var data = entry.maybeData.val;
                    
                    if ( false ) {
                    } else {
                        // TODO: Support meta-messages like
                        // [ "isScrappable" ] and [ "shutDown" ] to
                        // support garbage collection and graceful
                        // shutdown.
                        
                        // We don't recognize this message. Respond
                        // with a dummy value.
                        self.clientMembrane_.setOutResponse(
                            delayMillis,
                            data,
                            [],
                            entry.startMillis + delayMillis,
                            entry.maybeEndMillis.val + delayMillis );
                    }
                } );
            } );
            explicitlyIgnoreMembraneDemand( self.clientMembrane_ );
        } );
    return self;
};
UselessResource.prototype.receiveMessage = function ( message ) {
    this.clientMembrane_.receiveMessage( message );
};

// TODO: See if we actually want to model resources in terms of
// MessageMembranes like this.
function DispatcherResource() {}
DispatcherResource.prototype.init = function ( makeResource,
    outPermanentUntilMillis, deferForBatching, sendMessage ) {
    
    var self = this;
    
    var resources = new ElasticMap().init( {
        keyHash: function ( discriminator ) {
            return dataHash( discriminator );
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return dataIsoAssumingHashIso( a, b );
        },
        retractVal: function ( resource ) {
            return false;
        },
        makeVal: function (
            discriminator, inAndOutPermanentUntilMillis ) {
            
            // TODO: See if we should pass some kind of debugInfo to
            // this MessageMembrane.
            var resourceMembrane = new MessageMembrane().init(
                inAndOutPermanentUntilMillis, deferForBatching,
                function ( message ) {
                    resource.receiveMessage( message );
                },
                function () {  // syncOnInDemandAvailable
                    
                    // Send the resource's demand to the client.
                    
                    var permanentUntilMillis =
                        resourceMembrane.getInPermanentUntilMillis();
                    _.arrEach(
                        resourceMembrane.getInDemandHistoryEntries(),
                        function ( demand ) {
                        
                        var delayMillis = demand.delayMillis;
                        var demandEntries = demand.demandDataHistory;
                        var startMillis =
                            demandEntries[ 0 ].startMillis;
                        var demander =
                            self.clientMembrane_.getNewOutDemander(
                            startMillis, delayMillis,
                            function () {  // syncOnResponseAvailable
                            
                            // Send the client's response back to
                            // the resource.
                            promoteDemanderResponseToOutResponse(
                                delayMillis,
                                demander,
                                resourceMembrane );
                        } );
                        _.arrEach( demandEntries, function ( entry ) {
                            // TODO: See if we actually need the
                            // messages to contain "maybeEndMillis"
                            // instead of just "endMillis".
                            if ( entry.maybeEndMillis === null )
                                return;
                            if ( entry.maybeData === null )
                                demander.suspendDemand(
                                    entry.startMillis,
                                    entry.maybeEndMillis.val );
                            else
                                demander.setDemand(
                                    [ discriminator,
                                        entry.maybeData.val ],
                                    entry.startMillis,
                                    entry.maybeEndMillis.val );
                        } );
                        demander.finishDemand( startMillis );
                    } );
                    resourceMembrane.forgetInDemandBeforeDemandMillis(
                        permanentUntilMillis );
                } );
            var resource = makeResource.call( {},
                discriminator,
                inAndOutPermanentUntilMillis,
                deferForBatching,
                function ( message ) {
                    resourceMembrane.receiveMessage( message );
                } );
            return resource;
        }
    } );
    
    // TODO: See if we should pass some kind of debugInfo to this
    // MessageMembrane.
    self.clientMembrane_ = new MessageMembrane().init(
        outPermanentUntilMillis, deferForBatching, sendMessage,
        function () {  // syncOnInDemandAvailable
            
            var permanentUntilMillis =
                self.clientMembrane_.getInPermanentUntilMillis();
            _.arrEach(
                self.clientMembrane_.getInDemandHistoryEntries(),
                function ( demand ) {
                
                var delayMillis = demand.delayMillis;
                var resourceDemanders = new ElasticMap().init( {
                    keyHash: function ( discriminator ) {
                        return dataHash( inputData );
                    },
                    keyIsoAssumingHashIso: function ( a, b ) {
                        return dataIsoAssumingHashIso( a, b );
                    },
                    retractVal: function ( resourceDemander ) {
                        return false;
                    },
                    makeVal: function ( discriminator, startMillis ) {
                        var demander = resources.getOrMake(
                            discriminator, startMillis
                        ).getNewOutDemander( startMillis, delayMillis,
                            function () {  // syncOnResponseAvailable
                            
                            // Send the resource's response back to
                            // the client.
                            promoteDemanderResponseToOutResponse(
                                delayMillis,
                                demander,
                                self.clientMembrane_ );
                        } );
                        return {
                            demander: demander,
                            endMillis: startMillis
                        };
                    }
                } );
                _.arrEach( demand.demandDataHistory,
                    function ( entry ) {
                    
                    if ( entry.maybeData === null )
                        return;
                    var data = entry.maybeData.val;
                    
                    if ( true
                        && _.likeArray( data )
                        && data.length === 2
                        && data[ 0 ] === "passthrough"
                        && _.likeArray( data[ 1 ] )
                        && data[ 1 ].length === 2
                    ) {
                        // Send the client's demand to the appropriate
                        // resource.
                        
                        var demander = resourceDemanders.getOrMake(
                            data[ 1 ][ 0 ], entry.startMillis );
                        demander.demander.setDemand(
                            [ "passthrough", data[ 1 ][ 1 ] ],
                            entry.startMillis,
                            entry.maybeEndMillis.val
                        );
                        demander.endMillis = Math.max(
                            demander.endMillis,
                            entry.maybeEndMillis.val );
                    } else {
                        // TODO: Support meta-messages like
                        // [ "isScrappable" ] and [ "shutDown" ] to
                        // support garbage collection and graceful
                        // shutdown.
                        
                        // We don't recognize this message. Respond
                        // with a dummy value.
                        self.clientMembrane_.setOutResponse(
                            delayMillis,
                            data,
                            [],
                            entry.startMillis + delayMillis,
                            entry.maybeEndMillis.val + delayMillis );
                    }
                } );
                resourceDemanders.asMap().each(
                    function ( discriminator, demander ) {
                    
                    demander.demander.finishDemand(
                        demander.endMillis );
                } );
            } );
            self.clientMembrane_.forgetInDemandBeforeDemandMillis(
                permanentUntilMillis );
        } );
    return self;
};
DispatcherResource.prototype.receiveMessage = function ( message ) {
    this.clientMembrane_.receiveMessage( message );
};



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
    
    var writable = {};
    writable.addConnectionDependency = function ( dependency ) {
        connectionDependencies.push( dependency );
    };
    writable.onStaticInvoke = function ( func ) {
        if ( doStaticInvoke !== null || func === null )
            throw new Error();
        doStaticInvoke = func;
    };
    writable.readFrom = function ( readable ) {
        // NOTE: This is just a convenience method.
        
        writable.addConnectionDependency( readable );
        writable.onStaticInvoke(
            function ( context, delayMillis, inSigs, outSigs ) {
            
            readable.doStaticInvoke(
                context, delayMillis, inSigs, outSigs );
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
        context, delayMillis, inSigs, outSigs ) {
        
        if ( doStaticInvoke === null )
            throw new Error();
        doStaticInvoke( context, delayMillis, inSigs, outSigs );
    };
    
    return { writable: writable, readable: readable };
}

function makePairsForType( startMillis, type ) {
    var pairs = mapTypeLeafInfo( type, function ( type ) {
        if ( type.op === "atom" ) {
            return makeLinkedSigPair( startMillis );
        } else if ( type.op === "anytimeFn" ) {
            return makeAnytimeFnInstallationPair( startMillis, type );
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
    // TODO: This seems to work just fine when typesUnify's parameters
    // are switched. Figure out why.
    var diff = typesUnify( behOne.outType, behTwo.inType );
    if ( diff === null )
        throw new Error();
    
    var result = {};
    result.inType = behOne.inType;
    result.outType = diff.offsetMillis === null ? behTwo.outType :
        typePlusOffsetMillis( diff.offsetMillis, behTwo.outType );
    result.install = function ( context, inSigs, outSigs ) {
        var pairs =
            makePairsForType( context.startMillis, behOne.outType );
        behOne.install( context, inSigs, pairs.writables );
        behTwo.install( context, pairs.readables, outSigs );
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
    result.inType = typePlus( origLeftType, origRightType );
    result.outType = typePlus( origRightType, origLeftType );
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
    result.install = function ( context, inSigs, outSigs ) {
        var activitySigsType = typeOne();
        var leftActivitySigs = typeOne();
        var rightActivitySigs = typeOne();
        var informantGroups = informantsNeeded.map(
            function ( unused, offsetMillis ) {
            
            activitySigsType = typeTimes(
                typeAtom( offsetMillis, null ), activitySigsType );
            var leftPair = makeLinkedSigPair();
            leftActivitySigs = typeTimes(
                typeAtom( offsetMillis, leftPair.readable ),
                leftActivitySigs );
            var rightPair = makeLinkedSigPair();
            rightActivitySigs = typeTimes(
                typeAtom( offsetMillis, rightPair.readable ),
                rightActivitySigs );
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
        function dupActivitySigs() {
            function dup( activitySigs ) {
                var dupFirst = makePairsForType(
                    context.startMillis, activitySigs );
                var dupSecond = makePairsForType(
                    context.startMillis, activitySigs );
                behDup( activitySigsType ).install(
                    context, activitySigs,
                    typeTimes(
                        dupFirst.writables, dupSecond.writables ) );
                return { first: dupFirst.readables,
                    second: dupSecond.readables };
            }
            splittingActivitySigs = true;
            var leftDup = dup( leftActivitySigs );
            var rightDup = dup( rightActivitySigs );
            leftActivitySigs = leftDup.second;
            rightActivitySigs = rightDup.second;
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
            type, inSigs.left, inSigs.right, outSigs,
            function ( type, unused, inSigLeft, inSigRight, outSig ) {
            
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
                        
                        outSig.history.addEntry( makeEntry(
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
                // TODO: See if this code is prepared for the fact
                // that readEachEntry may yield entries that overlap
                // with each other.
                inSigLeft.readEachEntry( function ( entry ) {
                    leftPending.push( entry );
                    processMergePending();
                } );
                inSigRight.readEachEntry( function ( entry ) {
                    rightPending.push( entry );
                    processMergePending();
                } );
            } else if ( type.op === "anytimeFn" ) {
                outSig.addConnectionDependency( inSigLeft );
                outSig.addConnectionDependency( inSigRight );
                outSig.onStaticInvoke( function (
                    context, delayMillis, inSigs, outSigs ) {
                    
                    var inSigLeftPairs = makePairsForType(
                        context.startMillis, type.demand );
                    var inSigRightPairs = makePairsForType(
                        context.startMillis, type.demand );
                    var outSigLeftPairs = makePairsForType(
                        context.startMillis, type.response );
                    var outSigRightPairs = makePairsForType(
                        context.startMillis, type.response );
                    
                    // Split the inputs.
                    var aSigs = activitySigsType;
                    behSeqs(
                        behDisjoin( type.demand, aSigs, aSigs ),
                        behEither( behFst( type.demand, aSigs ),
                            behFst( type.demand, aSigs ) )
                    ).install( context,
                        typeTimes( inSigs, dupActivitySigs() ),
                        typePlus(
                            inSigLeftPairs.writable,
                            inSigRightPairs.writable )
                    );
                    
                    inSigLeft.doStaticInvoke( context, delayMillis,
                        inSigLeftPairs.readable,
                        outSigLeftPairs.writable );
                    inSigRight.doStaticInvoke( context, delayMillis,
                        inSigRightPairs.readable,
                        outSigRightPairs.writable );
                    
                    // Merge the outputs.
                    behMerge( type.response ).install( context,
                        typePlus(
                            outSigLeftPairs.readable,
                            outSigRightPairs.readable ),
                        outSigs );
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
    result.install = function ( context, inSigs, outSigs ) {
        
        ignoreOutSigs( outSigs );
        function ignoreOutSigs( outSigs ) {
            eachTypeLeafNodeOver( outSigs, function ( type, outSig ) {
                if ( type.op === "atom" ) {
                    context.onBegin( function () {
                        outSig.history.finishData(
                            context.startMillis );
                        return !!"wasAbleToFinish";
                    } );
                } else if ( type.op === "anytimeFn" ) {
                    outSig.onStaticInvoke( function (
                        context, delayMillis, inSigs, outSigs ) {
                        
                        ignoreOutSigs( outSigs );
                        eachTypeLeafNodeOver( inSigs,
                            function ( type, inSig ) {
                            
                            if ( type.op === "atom" ) {
                                inSig.readEachEntry(
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
    result.install = function ( context, inSigs, outSigs ) {
        var bins = [];
        function getBin( offsetMillis ) {
            return _.arrAny( bins, function ( bin ) {
                return bin.offsetMillis === offsetMillis && bin;
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
                        informants: [],
                        branchesPending: []
                    };
                    bins.push( bin );
                }
                var pending = [];
                bin.branchesPending.push( {
                    outSigLeft: outSigLeft,
                    outSigRight: outSigRight,
                    conditionPending: new ActivityHistory().init( {
                        startMillis: context.startMillis
                    } ),
                    finalCondition: null,
                    dataPending: pending
                } );
                // TODO: See if this code is prepared for the fact
                // that readEachEntry may yield entries that overlap
                // with each other.
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
                    var informantHistory =
                        new ActivityHistory().init( {
                            startMillis: context.startMillis
                        } );
                    if ( !!bin )
                        bin.informants.push( {
                            condition: condition,
                            history: informantHistory
                        } );
                    // TODO: See if this code is prepared for the fact
                    // that readEachEntry may yield entries that
                    // overlap with each other.
                    inSig.readEachEntry( function ( entry ) {
                        outSig.history.addEntry( entry );
                        if ( !!bin ) {
                            informantHistory.addEntry(
                                censorEntry( entry ) );
                            processPending();
                        }
                    } );
                } else if ( type.op === "anytimeFn" ) {
                    outSig.addConnectionDependency( inSig );
                    outSig.onStaticInvoke( function (
                        context, delayMillis, inSigs, outSigs ) {
                        
                        inSig.doStaticInvoke(
                            context, delayMillis, inSigs, outSigs );
                    } );
                } else {
                    throw new Error();
                }
            } );
        }
        eachOnOneSide( "left", "notLeft", leftType,
            inSigs.second.left, outSigs.left.second );
        eachOnOneSide( "right", "notRight", rightType,
            inSigs.second.right, outSigs.right.second );
        
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
        context, inSigsEncapsulated, outSigsFunc ) {
        
        var outSigFunc = outSigsFunc.leafInfo;
        
        var invocations = [];
        
        eachTypeLeafNodeZipper( inSigsEncapsulated, _.idfn,
            function ( get ) {
            
            var type = get( inSigsEncapsulated );
            var inSig = type.leafInfo;
            
            if ( type.op === "atom" ) {
                inSig.readEachEntry( function ( entry ) {
                    _.arrEach( invocations, function ( invocation ) {
                        var responseSig =
                            get( invocation.writables ).leafInfo;
                        delayAddEntry( responseSig,
                            invocation.delayMillis, entry );
                    } );
                } );
            } else if ( type.op === "anytimeFn" ) {
                // Do nothing.
                
                // NOTE: We already use addConnectionDependency and
                // onStaticInvoke elsewhere.
                
            } else {
                throw new Error();
            }
        } );
        
        outSigFunc.onStaticInvoke( function (
            context, delayMillis, inSigsParam, outSigsResult ) {
            
            var delayedEncapsulatedPairs = makePairsForType(
                context.startMillis, encapsulatedType );
            
            eachTypeLeafNodeOver(
                inSigsEncapsulated,
                delayedEncapsulatedPairs.writables,
                function ( type, inSig, outSig ) {
                
                if ( type.op === "atom" ) {
                    // Do nothing.
                    
                    // NOTE: We already use readEachEntry and
                    // delayAddEntry elsewhere.
                    
                } else if ( type.op === "anytimeFn" ) {
                    outSig.addConnectionDependency( inSig );
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
                    typePlus( inSigsParam, typeOne() ) ),
                typePlus( outSigsResult, typeOne() ) );
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
    result.outType = typePlusOffsetMillis( delayMillis, type );
    result.install = function ( context, inSigs, outSigs ) {
        eachTypeLeafNodeOver( inSigs, outSigs,
            function ( type, inSig, outSig ) {
            
            if ( type.op === "atom" ) {
                inSig.readEachEntry( function ( entry ) {
                    delayAddEntry( outSig, delayMillis, entry );
                } );
            } else if ( type.op === "anytimeFn" ) {
                outSig.addConnectionDependency( inSig );
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
            if ( !(direction === null
                || direction === "<"
                || direction === ">") )
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
        
        var sentMillis = -1 / 0;
        
        inSigFirst.syncOnAdd( function () {
            sendOut();
        } );
        inSigSecond.syncOnAdd( function () {
            sendOut();
        } );
        function sendOut() {
            // TODO: See if this should use consumeEarliestEntries.
            // For that matter, see if consumeEarliestEntries should
            // use this!
            var entriesFirst = inSigFirst.history.getAllEntries();
            var entriesSecond = inSigSecond.history.getAllEntries();
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
            inSigFirst.history.forgetBeforeMillis( endToSendMillis );
            inSigSecond.history.forgetBeforeMillis( endToSendMillis );
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
        var demandPair = makeLinkedSigPair( startMillis );
        var demandAndResponsePair =
            makeLinkedSigPair( startMillis + delayMillis );
        var beh = delayToBeh( delayMillis );
        if ( !(true
            && !!typesUnify( typeAtom( 0, null ), beh.inType )
            && typesAreEqual( delayMillis, beh.inType, beh.outType )
        ) )
            throw new Error();
        poolEntry = {
            nextStartMillis: startMillis,
            responseAlreadyGivenMillis: startMillis + delayMillis,
            demandSig: demandPair.writable
        };
        demandAndResponsePair.readable.readEachEntry(
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
        var onBeginObj = makeOnBegin();
        behSeqs(
            behDupPar(
                behDelay( delayMillis, typeAtom( 0, null ) ),
                beh
            ),
            behZip()
        ).install(
            {
                startMillis: startMillis,
                membrane: context.membrane,
                onBegin: onBeginObj.onBegin
            },
            typeAtom( 0, demandPair.readable ),
            typeAtom( delayMillis, demandAndResponsePair.writable ) );
        onBeginObj.begin();
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
    demander.install = function ( context, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        
        var i = installedDemanders.length;
        
        installedDemanders.push(
            { startMillis: context.startMillis } );
        inSig.readEachEntry( function ( entry ) {
            createDemandersPending();
            _.arrEach( installedMonitors, function ( monitor ) {
                monitor.demandersPending[ i ].addEntry( entry );
                defer( function () {
                    monitor.processPending();
                } );
            } );
        } );
    };
    
    var monitor = {};
    monitor.inType = typeAtom( 0, null );
    monitor.outType = typeAtom( 0, null );
    monitor.install = function ( context, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        var outSig = outSigs.leafInfo;
        
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
                entEnd( outSig.history.getLastEntry() );
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
                
                outSig.history.addEntry( {
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
                    outSig.history.addEntry( nextMonitorEntry );
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
        installedMonitors.push( monitorInfo );
        inSig.readEachEntry( function ( entry ) {
            monitorPending.addEntry( entry );
            defer( function () {
                createDemandersPending();
                processPending();
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
    updaterInternal.install = function ( context, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        var outSig = outSigs.leafInfo;
        
        inSig.readEachEntry( function ( entry ) {
            
            if ( entEnd( entry ) < updaterHistoryEndMillis ) {
                outSig.history.addEntry( {
                    maybeData: { val: "" },
                    startMillis: entry.startMillis,
                    maybeEndMillis: entry.maybeEndMillis
                } );
                return;
            }
            
            if ( updaterHistoryEndMillis === 1 / 0 ) {
                outSig.history.addEntry( {
                    maybeData: null,
                    startMillis: entry.startMillis,
                    maybeEndMillis: null
                } );
                
            } else if (
                entry.startMillis < updaterHistoryEndMillis ) {
                
                outSig.history.addEntry( {
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
                outSig.history.addEntry( {
                    maybeData: { val: JSON.stringify( currentVal ) },
                    startMillis:
                        outSig.history.getLastEntry().startMillis,
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
                    outSig.history.addEntry( {
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
                outSig.history.addEntry( {
                    maybeData: { val: JSON.stringify( currentVal ) },
                    startMillis: updaterHistoryEndMillis,
                    maybeEndMillis:
                        { val: nextUpdaterHistoryEndMillis }
                } );
                advanceUpdaterHistoryEndMillis(
                    nextUpdaterHistoryEndMillis );
            }
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
    result.install = function ( context, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        var outSig = outSigs.leafInfo;
        
        var currentVal = opts.apologyVal;
        opts.listenOnUpdate.call( {}, function ( newVal ) {
            currentVal = newVal;
        } );
        var responsesToGive = [];
        // TODO: See if this code is prepared for the fact that
        // readEachEntry may yield entries that overlap with each
        // other.
        inSig.readEachEntry( function ( entry ) {
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
                outSig.history.addEntry( {
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
                    outSig.history.setData( opts.apologyVal,
                        rtg.startMillis, rtg.maybeEndMillis.val );
                    continue;
                }
                
                var thisStartToSendMillis =
                    Math.max( rtg.startMillis, startToSendMillis );
                var thisEndToSendMillis = Math.min(
                    rtg.maybeEndMillis.val, endToSendMillis );
                outSig.history.setData( opts.apologyVal,
                    rtg.startMillis, thisStartToSendMillis );
                outSig.history.setData( currentVal,
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
    result.install = function ( context, inSigs, outSigs ) {
        var inSig = inSigs.leafInfo;
        
        var sentMillis = -1 / 0;
        
        inSig.readEachEntry( function ( entry ) {
            
            // TODO: Give Lathe.js a setTimeout equivalent which does
            // this. The point is that setTimeout has a lower limit on
            // its time interval, so Lathe.js's _.defer() might
            // actually use a more responsive technique when the
            // interval is small, such as postMessage, setImmediate,
            // process.nextTick, or requestAnimationFrame.
            //
            // TODO: See if 10 ms is the right lower bound to use
            // here.
            //
            // TODO: See if we should somehow protect against cases
            // where _.defer( func ) actually fires sooner than we
            // want it to.
            //
            function quickSetTimeout( millis, func ) {
                if ( millis < 10 )
                    _.defer( func );
                else
                    setTimeout( func, millis );
            }
            
            quickSetTimeout( entry.startMillis - new Date().getTime(),
                function () {
                
                // In case the quickSetTimeout calls get out of order,
                // don't send this value.
                if ( entry.startMillis < sentMillis )
                    return;
                sentMillis = entry.startMillis;
                
                opts.onUpdate.call( {}, entry.maybeData );
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



// underreact-lambda.js

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

function makeLambdaLangNameMap() {
    return new Map().init( {
        keyHash: function ( k ) {
            return k;
        },
        keyIsoAssumingHashIso: function ( a, b ) {
            return true;
        }
    } );
}

function runLambdaLang( context, envImpl, outImpl, code ) {
    var freeVars = code.getFreeVars();
    var envImplArr = [];
    var varInfoByIndex = [];
    var varInfoByName = freeVars.map( function ( unused, name ) {
        if ( !envImpl.has( name ) )
            throw new Error();
        var impl = envImpl.get( name );
        var type = stripType( impl );
        var index = envImplArr.length;
        envImplArr.push( impl );
        varInfoByIndex.push( { name: name, type: type } );
        return { index: index, type: type };
    } );
    var outType = stripType( outImpl );
    var compiled =
        code.compile( varInfoByIndex, varInfoByName, outType );
    compiled.install( context,
        _.arrFoldr( envImplArr, typeOne(), function ( impl, rest ) {
            return typeTimes( impl, rest );
        } ),
        outImpl );
}

function LambdaLangCode() {}
LambdaLangCode.prototype.init = function () {
    return this;
};

var lambdaLang = {};

lambdaLang.va = function ( name ) {
    if ( !_.isString( name ) )
        throw new Error();
    name += "";
    
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "$" + name;
    };
    result.getFreeVars = function () {
        var freeVars = makeLambdaLangNameMap();
        freeVars.set( name, true );
        return freeVars;
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        // TODO: See if we can change this to a simple behFst, now
        // that we only get our own free variables in the environment.
        var remainingEnvType =
            lambdaLangVarInfoByIndexToType( varInfoByIndex );
        var seq = [];
        for ( var i = varInfoByName.get( name ).index; 0 < i; i-- ) {
            seq.push( behSnd(
                remainingEnvType.first, remainingEnvType.second ) );
            remainingEnvType = remainingEnvType.second;
        }
        seq.push( behFst(
            remainingEnvType.first, remainingEnvType.second ) );
        return behSeqsArr( seq );
    };
    return result;
};

function lambdaLangVarInfoByIndexToType( varInfoByIndex ) {
    return _.arrFoldr( varInfoByIndex, typeOne(),
        function ( varInfo, rest ) {
        
        return typeTimes( varInfo.type, rest );
    } );
}

function lambdaLangVarInfoByIndexToByName( varInfoByIndex ) {
    var varInfoByName = makeLambdaLangNameMap();
    _.arrEach( varInfoByIndex, function ( varInfo, i ) {
        varInfoByName.set(
            varInfo.name, { type: varInfo.type, index: i } );
    } );
    return varInfoByName;
}

function behLambdaLang( origVarInfoByIndex, expr, outType ) {
    var finalFreeVars = expr.getFreeVars();
    var almostResult = _.arrFoldr( origVarInfoByIndex, {
        varTypeBefore: typeOne(),
        varInfoByIndexAfter: [],
        beh: behId( typeOne() )
    }, function ( varInfo, r ) {
        
        return finalFreeVars.has( varInfo.name ) ? {
            varTypeBefore: typeTimes( varInfo.type, r.varTypeBefore ),
            varInfoByIndexAfter:
                [ varInfo ].concat( r.varInfoByIndexAfter ),
            beh: behPar( behId( varInfo.type ), r.beh )
        } : {
            varTypeBefore: typeTimes( varInfo.type, r.varTypeBefore ),
            varInfoByIndexAfter: r.varInfoByIndexAfter,
            beh: behSeqs(
                behSnd( varInfo.type, r.varTypeBefore ),
                r.beh
            )
        };
    } );
    var varInfoByName = lambdaLangVarInfoByIndexToByName(
        almostResult.varInfoByIndexAfter );
    return behSeqs(
        almostResult.beh,
        expr.compile(
            almostResult.varInfoByIndexAfter, varInfoByName, outType )
    );
}

lambdaLang.fn = function ( argName, body ) {
    if ( !_.isString( argName ) )
        throw new Error();
    argName += "";
    if ( !(body instanceof LambdaLangCode) )
        throw new Error();
    
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "\$" + argName + " -> " + body.toString();
    };
    result.getFreeVars = function () {
        var freeVars = body.getFreeVars().copy();
        freeVars.del( argName );
        return freeVars;
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        if ( outType.op !== "anytimeFn" )
            throw new Error();
        var argType = outType.demand;
        var innerOutType = outType.response;
        
        // NOTE: We only receive the variables we need, so we don't
        // need to worry about introducing a duplicate variable name
        // here. Just to be safe, however, we do a sanity check first.
        if ( varInfoByName.has( argName ) )
            throw new Error();
        var innerVarInfoByIndex = [ { name: argName, type: argType }
            ].concat( varInfoByIndex );
        
        return behClosure( behSeqs(
            behSwap( lambdaLangVarInfoByIndexToType( varInfoByIndex ),
                argType ),
            behLambdaLang( innerVarInfoByIndex, body, innerOutType )
        ) );
    };
    return result;
};

function behDupParLambdaLang( varInfoByIndex,
    firstExpr, firstOutType, secondExpr, secondOutType ) {
    
    return behDupPar(
        behLambdaLang( varInfoByIndex, firstExpr, firstOutType ),
        behLambdaLang( varInfoByIndex, secondExpr, secondOutType )
    );
}

lambdaLang.call = function ( op, argType, argVal ) {
    var result = new LambdaLangCode().init();
    result.toString = function () {
//        return "(" + op.toString() + " " +
//            typeToString( argType ) + " " + argVal.toString() + ")";
        return "(" + op.toString() + " " + argVal.toString() + ")";
    };
    result.getFreeVars = function () {
        return op.getFreeVars().plus( argVal.getFreeVars() );
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var opType = typeAnytimeFn( argType, outType, null );
        return behSeqs(
            behDupParLambdaLang(
                varInfoByIndex, op, opType, argVal, argType ),
            behCall( opType )
        );
    };
    return result;
};

lambdaLang.beh = function ( beh ) {
    // TODO: See if we should take some kind of offsetMillis
    // parameter, rather than using the behavior's own inType to
    // determine the time offsets.
    var result = new LambdaLangCode().init();
    result.toString = function () {
        // TODO: See if this can be more informative.
        return "#<beh:" + beh + ">";
    };
    result.getFreeVars = function () {
        return makeLambdaLangNameMap();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var diff = typesUnify( outType, beh.outType );
        if ( !diff )
            throw new Error();
        
        return behClosure( behSeqs(
            behSnd( typeOne(), typePlusOffsetMillis(
                diff.offsetMillis !== null ? diff.offsetMillis : 0,
                beh.inType ) ),
            beh
        ) );
    };
    return result;
};

lambdaLang.useBeh = function ( beh, argVal ) {
    // TODO: See if we should take some kind of offsetMillis
    // parameter, rather than using the behavior's own inType to
    // determine the time offsets.
    var result = new LambdaLangCode().init();
    result.toString = function () {
        // TODO: See if this can be more informative.
        return "#<useBeh:" + beh + "> " + argVal.toString();
    };
    result.getFreeVars = function () {
        return argVal.getFreeVars();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var diff = typesUnify( outType, beh.outType );
        if ( !diff )
            throw new Error();
        
        return behSeqs(
            argVal.compile( varInfoByIndex, varInfoByName,
                typePlusOffsetMillis(
                    diff.offsetMillis !== null ?
                        diff.offsetMillis : 0,
                    beh.inType ) ),
            beh
        );
    };
    return result;
};

lambdaLang.delay = function ( delayMillis, body ) {
    if ( !isValidDuration( delayMillis ) )
        throw new Error();
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "#<delay:" + delayMillis + "> " + body.toString();
    };
    result.getFreeVars = function () {
        return body.getFreeVars();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var midType = typePlusOffsetMillis( -delayMillis, outType );
        
        return behSeqs(
            body.compile( varInfoByIndex, varInfoByName, midType ),
            behDelay( delayMillis, midType )
        );
    };
    return result;
};

lambdaLang.one = function () {
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "1";
    };
    result.getFreeVars = function () {
        return makeLambdaLangNameMap();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        if ( outType.op !== "one" )
            throw new Error();
        // TODO: See if we can replace this as follows, since we no
        // longer get more variables in scope than we need.
//        return behDrop( typeZero() );
        return behDrop(
            lambdaLangVarInfoByIndexToType( varInfoByIndex ) );
    };
    return result;
};

lambdaLang.times = function ( first, second ) {
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "(" + first.toString() + " * " +
            second.toString() + ")";
    };
    result.getFreeVars = function () {
        return first.getFreeVars().plus( second.getFreeVars() );
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        if ( outType.op !== "times" )
            throw new Error();
        return behDupParLambdaLang( varInfoByIndex,
            first, outType.first, second, outType.second );
    };
    return result;
};

lambdaLang.fst = function ( secondType, pair ) {
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "#fst " + pair.toString();
    };
    result.getFreeVars = function () {
        return pair.getFreeVars();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        return behSeqs(
            pair.compile(
                varInfoByIndex, varInfoByName,
                typeTimes( outType, secondType ) ),
            behFst( outType, secondType )
        );
    };
    return result;
};

lambdaLang.zip = function ( pair ) {
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "#zip " + pair.toString();
    };
    result.getFreeVars = function () {
        return pair.getFreeVars();
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        if ( outType.op !== "atom" )
            throw new Error();
        return behSeqs(
            pair.compile(
                varInfoByIndex, varInfoByName,
                typeTimes( outType, outType ) ),
            behZip()
        );
    };
    return result;
};

lambdaLang.zipTimes = function ( first, second ) {
    return lambdaLang.zip( lambdaLang.times( first, second ) );
};

lambdaLang.letPlus = function ( condition, conditionType,
    leftName, leftThen, rightName, rightThen ) {
    
    if ( !(condition instanceof LambdaLangCode) )
        throw new Error();
    // TODO: Verify that conditionType is a type.
    if ( conditionType.op !== "plus" )
        throw new Error();
    if ( !_.isString( leftName ) )
        throw new Error();
    leftName += "";
    if ( !_.isString( rightName ) )
        throw new Error();
    rightName += "";
    if ( !(leftThen instanceof LambdaLangCode) )
        throw new Error();
    if ( !(rightThen instanceof LambdaLangCode) )
        throw new Error();
    
    // NOTE: This lets us avoid writing variable-shadowing code.
    var leftFn = lambdaLang.fn( leftName, leftThen );
    var rightFn = lambdaLang.fn( rightName, rightThen );
    
    var result = new LambdaLangCode().init();
    result.toString = function () {
        return "(#case " + condition.toString() + " " +
//            ": " + typeToString( conditionType ) + " " +
            "in " +
            "#left " + leftName + " -> " +
                leftThen.toString() + " ; " +
            "#right " + rightName + " -> " +
                rightThen.toString() + ")";
    };
    result.getFreeVars = function () {
        var leftFreeVars = leftThen.getFreeVars().copy();
        leftFreeVars.del( leftName );
        var rightFreeVars = rightThen.getFreeVars().copy();
        rightFreeVars.del( rightName );
        return condition.getFreeVars().
            plus( leftFreeVars ).plus( rightFreeVars );
    };
    result.compile = function (
        varInfoByIndex, varInfoByName, outType ) {
        
        var $ = lambdaLang;
        var fnsType = typeTimes(
            typeAnytimeFn( conditionType.left, outType, null ),
            typeAnytimeFn( conditionType.right, outType, null ) )
        return behSeqs(
            behLambdaLang( varInfoByIndex,
                $.times(
                    $.times(
                        $.fn( leftName, leftThen ),
                        $.fn( rightName, rightThen ) ),
                    condition ),
                typeTimes( fnsType, conditionType ) ),
            behDisjoin(
                fnsType, conditionType.left, conditionType.right ),
            behEither(
                behSeqs(
                    behFirst(
                        behFst( fnsType.first, fnsType.second ),
                        conditionType.left ),
                    behCall( fnsType.first )
                ),
                behSeqs(
                    behFirst(
                        behSnd( fnsType.first, fnsType.second ),
                        conditionType.right ),
                    behCall( fnsType.second )
                )
            ),
            behMerge( outType )
        );
    };
    return result;
};



return (function () {
    var result = {};
    result.behDisjoin = behDisjoin;
    return result;
})();
})();
for ( var k in exportsOrig )
    if ( {}.hasOwnProperty.call( exportsOrig, k ) )
        exports[ k ] = exportsOrig[ k ];
