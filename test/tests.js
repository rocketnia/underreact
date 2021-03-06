// Underreact
// tests.js

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
// TODO: Reimplement resources in terms of makeLinkedWirePair objects
// instead of membranes.


"use strict";


if ( Math.min( 3, 2, 1 ) !== 1 )
    throw new Error();

function makeTestForDemandOverLinkedPair() {
    var now = new Date().getTime();
    function deferForBatching( func ) {
        setTimeout( function () {
            func();
        }, 0 );
    }
    
    var displayDom = _.dom( "div" );
    
    var pairDelayMillis = 1000;
    var mousePosition = JSON.stringify( null );
    _.appendDom( window, { mousemove: function ( e ) {
        mousePosition = JSON.stringify( [ e.clientX, e.clientY ] );
    } } );
    var mouseHistory = new ActivityHistory().init( {
        startMillis: now
    } );
    
    var pair = makeLinkedMembranePair( now, deferForBatching, {
        type: "makeTestForDemandOverLinkedPair"
    } );
    pair.a.syncOnInDemandAvailable( function () {
        explicitlyIgnoreMembraneDemand( pair.a.membrane );
    } );
    pair.b.syncOnInDemandAvailable( function () {
        var permanentUntilMillis =
            pair.b.membrane.getInPermanentUntilMillis();
        _.arrEach( pair.b.membrane.getInDemandHistoryEntries(),
            function ( demand ) {
            
            var delayMillis = demand.delayMillis;
            if ( delayMillis !== pairDelayMillis )
                return;
            _.arrEach( demand.demandDataHistory, function ( entry ) {
                if ( entry.maybeData === null )
                    return;
                var data = entry.maybeData.val;
                
                var endMillis = Math.min( entEnd( entry ),
                    permanentUntilMillis );
                if ( endMillis < entry.startMillis )
                    return;
                
                mouseHistory.setData(
                    data,
                    entry.startMillis + delayMillis,
                    endMillis + delayMillis );
            } );
        } );
        explicitlyIgnoreMembraneDemand( pair.b.membrane );
        pair.b.membrane.raiseOtherOutPermanentUntilMillis(
            permanentUntilMillis );
    } );
    var aDemander = pair.a.membrane.getNewOutDemander(
        now, pairDelayMillis,
        function () {  // syncOnResponseAvailable
            // Do nothing with the responses except forget them.
            getAndForgetDemanderResponse( aDemander );
        } );
    
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 10;
    var stabilityMillis = 500;  // 20;
    var otherOutStabilityMillis = 1000000;
    setInterval( function () {
        var now = new Date().getTime();
        
        aDemander.setDemand(
            mousePosition, now, now + stabilityMillis );
        pair.a.membrane.raiseOtherOutPermanentUntilMillis(
            now + otherOutStabilityMillis );
        
        mouseHistory.forgetBeforeMillis( now );
        _.dom( displayDom, JSON.stringify(
            mouseHistory.getAllEntries()[ 0 ].maybeData ) );
    }, intervalMillis );
    
    var result = {};
    result.dom = displayDom;
    return result;
}

function makeTestForResponseOverLinkedPair() {
    var now = new Date().getTime();
    function deferForBatching( func ) {
        setTimeout( function () {
            func();
        }, 0 );
    }
    
    var displayDom = _.dom( "div" );
    
    // NOTE: Although we delay the mouse-measurement demand by two
    // seconds, we demand the measurement at the midpoint between our
    // demand and the response, so we actually observe a delay of only
    // half that interval.
    var pairDelayMillis = 2000;
    var measurementDelayMillis = pairDelayMillis / 2;
    var mouseHistory = new ActivityHistory().init( {
        startMillis: now
    } );
    
    var pair = makeLinkedMembranePair( now, deferForBatching, {
        type: "makeTestForResponseOverLinkedPair"
    } );
    connectMouseQuery( pair.b );
    pair.a.syncOnInDemandAvailable( function () {
        explicitlyIgnoreMembraneDemand( pair.a.membrane );
    } );
    var aDemander = pair.a.membrane.getNewOutDemander(
        now, pairDelayMillis,
        function () {  // syncOnResponseAvailable
            var nowMillis = new Date().getTime();
            _.arrEach( getAndForgetDemanderResponse( aDemander ),
                function ( entry ) {
                
                // Pretend we didn't get this response until the time
                // it's actually scheduled for.
                setTimeout( next, entry.startMillis - nowMillis );
                function next() {
                    mouseHistory.addEntry( {
                        maybeData:
                            entry.maybeData === null ||
                                entry.maybeData.val.length === 1 ?
                                null :
                                { val: entry.maybeData.val[ 1 ] },
                        startMillis:
                            entry.startMillis - pairDelayMillis +
                                measurementDelayMillis,
                        maybeEndMillis:
                            entry.maybeEndMillis === null ?
                                null :
                                { val: entry.maybeEndMillis.val
                                    - pairDelayMillis
                                    + measurementDelayMillis }
                    } );
                }
            } );
        } );
    
    // TODO: Keep tuning these constants based on the interval
    // frequency we actually achieve, rather than the one we shoot
    // for.
    var intervalMillis = 10;
    var stabilityMillis = 500;  // 20;
    var otherOutStabilityMillis = 1000000;
    setInterval( function () {
        var nowMillis = new Date().getTime();
        
        aDemander.setDemand( JSON.stringify( measurementDelayMillis ),
            nowMillis, nowMillis + stabilityMillis );
        pair.a.membrane.raiseOtherOutPermanentUntilMillis(
            nowMillis + otherOutStabilityMillis );
        
        mouseHistory.forgetBeforeMillis(
            nowMillis - measurementDelayMillis );
        _.dom( displayDom, JSON.stringify(
            mouseHistory.getAllEntries()[ 0 ].maybeData ) );
    }, intervalMillis );
    
    var result = {};
    result.dom = displayDom;
    return result;
}

function makeConvenientHarness() {
    var nowMillis = new Date().getTime();
    function deferForBatching( func ) {
        setTimeout( function () {
            func();
        }, 0 );
    }
    var membranePair =
        makeLinkedMembranePair( nowMillis, deferForBatching, {
            type: "makeConvenientHarness"
        } );
    membranePair.a.syncOnInDemandAvailable( function () {
        explicitlyIgnoreMembraneDemand( membranePair.a.membrane );
    } );
    membranePair.b.syncOnInDemandAvailable( function () {
        explicitlyIgnoreMembraneDemand( membranePair.b.membrane );
    } );
    var context = makeContext( nowMillis, membranePair.b.membrane );
    var inPair = makeLinkedWirePair( context.context, nowMillis );
    var outPair = makeLinkedWirePair( context.context, nowMillis );
    
    var result = {};
    result.context = context.context;
    result.appActivityInWire = inPair.readable;
    result.appActivityOutWire = outPair.writable;
    result.begin = function () {
        context.begin();
        context.timeToMakeSigs();
        context.sigsReady();
        outPair.readable.sig.readEachEntry( function ( entry ) {
            // Do nothing.
        } );
        
        // TODO: Keep tuning these constants based on the interval
        // frequency we actually achieve, rather than the one we shoot
        // for.
        var intervalMillis = 10;
        var otherOutStabilityMillis = 1000000;
        var nowMillis = new Date().getTime();
        setInterval( function () {
            var prevMillis = nowMillis;
            nowMillis = new Date().getTime();
            var intervalAchievedMillis = nowMillis - prevMillis;
            if ( intervalMillis * 5 < intervalAchievedMillis ) {
                // We're probably an out-of-focus tab, so let's let
                // the app be inactive for a while.
                return;
            }
            
            // NOTE: To keep the gameplay smooth(ish), we don't let
            // gaps of inactivity appear while the tab is in focus.
            //
            // TODO: See if that's a good idea. If not, we can simply
            // replace prevMillis with nowMillis here.
            //
            inPair.writable.sig.history.setData( [],
                prevMillis, nowMillis + intervalAchievedMillis * 2 );
            
            membranePair.a.membrane.raiseOtherOutPermanentUntilMillis(
                nowMillis + otherOutStabilityMillis );
            membranePair.b.membrane.raiseOtherOutPermanentUntilMillis(
                nowMillis + otherOutStabilityMillis );
        }, intervalMillis );
    };
    return result;
}

function convenientlyInstallBehaviorWithCaps( caps, var_args ) {
    var beh = behSeqsArr( _.arrCut( arguments, 1 ) );
    if ( !(beh.inType.op === "times"
        && beh.inType.second.op === "atom"
        && beh.outType.op === "atom") )
        throw new Error();
    if ( typesUnify( caps, beh.inType.first ) === null )
        throw new Error();
    
    var harness = makeConvenientHarness();
    beh.install(
        harness.context,
        typeTimes( caps,
            typeAtom( beh.inType.second.offsetMillis,
                harness.appActivityInWire ) ),
        typeAtom( beh.outType.offsetMillis,
            harness.appActivityOutWire )
    );
    harness.begin();
}

function convenientlyInstallBehavior( var_args ) {
    convenientlyInstallBehaviorWithCaps( typeOne(),
        behSnd( typeOne(), typeAtom( 0, null ) ),
        behSeqsArr( arguments )
    );
}

function makeTestForBehaviors() {
    // NOTE: Although we delay the mouse-measurement demand by two
    // seconds, we demand the measurement at the midpoint between our
    // demand and the response, so we actually observe a delay of only
    // half that interval.
    var mouseDelayMillis = 2000;
    var measurementDelayMillis = mouseDelayMillis / 2;
    
    var dom = null;
    
    convenientlyInstallBehavior(
        behDelay( measurementDelayMillis, typeAtom( 0, null ) ),
        behMouseQuery(),
        behDelay( mouseDelayMillis - measurementDelayMillis,
            typeAtom( 0, null ) ),
        behDomDiagnostic( function ( linkMetadata ) {
            dom = linkMetadata.dom;
        } )
    );
    
    return { dom: dom };
}

// TODO: If we make behToCap a general-use utility, see if it should
// have a time offset parameter. Currently it just relies on whatever
// time offsets exist in the behavior's own inType and outType.
function behToCap( beh ) {
    return typeAnytimeFn( beh.inType, beh.outType, {
        isConnected: function () {
            return true;
        },
        doStaticInvoke: function (
            context, delayMillis, inWires, outWires ) {
            
            beh.install( context, inWires, outWires );
        }
    } );
}

function makeTestForBehCall() {
    
    // NOTE: Although we delay the mouse-measurement demand by two
    // seconds, we demand the measurement at the midpoint between our
    // demand and the response, so we actually observe a delay of only
    // half that interval.
    var mouseDelayMillis = 2000;
    var measurementDelayMillis = mouseDelayMillis / 2;
    
    var dom = null;
    
    var mouseCap = behToCap( behMouseQuery() );
    var mouseCapType = stripType( mouseCap );
    var domCap = behToCap( behDomDiagnostic(
        function ( linkMetadata ) {
        
        // TODO: This is awkward. If this capability is called twice,
        // we'll end up with only one of the DOM elements. Should this
        // use linear types?
        dom = linkMetadata.dom;
    } ) );
    var domCapType = stripType( domCap );
    var capsType = typeTimes( mouseCapType, domCapType );
    
    function d1( type ) {
        return typePlusOffsetMillis( measurementDelayMillis, type );
    }
    function d2( type ) {
        return typePlusOffsetMillis( mouseDelayMillis, type );
    }
    
    var atom = typeAtom( 0, null );
    
    convenientlyInstallBehaviorWithCaps(
        typeTimes( mouseCap, domCap ),
        
        // Delay to measurementDelayMillis, then call mouseCap.
        behFirst( behDup( capsType ), atom ),
        behAssocrp( capsType, capsType, atom ),
        behSecond( capsType,
            behFirst( behFst( mouseCapType, domCapType ), atom ) ),
        behDelay( measurementDelayMillis,
            typeTimes( capsType, typeTimes( mouseCapType, atom ) ) ),
        behSecond( d1( capsType ), behCall( d1( mouseCapType ) ) ),
        
        // Delay to mouseDelayMillis, then call domCap.
        behFirst( behDup( d1( capsType ) ), d1( atom ) ),
        behAssocrp( d1( capsType ), d1( capsType ), d1( atom ) ),
        behSecond( d1( capsType ),
            behFirst( behSnd( d1( mouseCapType ), d1( domCapType ) ),
                d1( atom ) ) ),
        behDelay( mouseDelayMillis - measurementDelayMillis,
            d1( typeTimes( capsType,
                typeTimes( domCapType, atom ) ) ) ),
        behSecond( d2( capsType ), behCall( d2( domCapType ) ) ),
        
        // Drop the capabilities.
        behSnd( d2( capsType ), d2( atom ) )
    );
    
    return { dom: dom };
}

function makeTestForLambdaLang() {
    
    // NOTE: Although we delay the mouse-measurement demand by two
    // seconds, we demand the measurement at the midpoint between our
    // demand and the response, so we actually observe a delay of only
    // half that interval.
    var mouseDelayMillis = 2000;
    var measurementDelayMillis = mouseDelayMillis / 2;
    
    var dom = null;
    
    var $ = lambdaLang;
    
    function td01( type ) {
        // Delay the type from step 0 to step 1.
        return typePlusOffsetMillis( measurementDelayMillis, type );
    }
    function td02( type ) {
        return typePlusOffsetMillis( mouseDelayMillis, type );
    }
    function ld01( expr ) {
        // Delay a LambdaLangCode expression from step 0 to step 1.
        return $.delay( measurementDelayMillis, expr );
    }
    function ld02( expr ) {
        return $.delay( mouseDelayMillis, expr );
    }
    function ld12( expr ) {
        return $.delay(
            mouseDelayMillis - measurementDelayMillis, expr );
    }
    
    var atom = typeAtom( 0, null );
    
    var harness = makeConvenientHarness();
    
    var envImpl = makeLambdaLangNameMap();
    envImpl.set( "appActivity",
        typeAtom( 0, harness.appActivityInWire ) );
    envImpl.set( "mouse", behToCap( behMouseQuery() ) );
    envImpl.set( "dom", behToCap( behDomDiagnostic(
        function ( linkMetadata ) {
        
        // TODO: This is awkward. If this capability is called twice,
        // we'll end up with only one of the DOM elements. Should this
        // use linear types?
        dom = linkMetadata.dom;
    } ) ) );
    
    runLambdaLang( harness.context, envImpl,
        td02( typeAtom( 0, harness.appActivityOutWire ) ),
        $.call( ld02( $.va( "dom" ) ), td02( atom ),
            ld12(
                $.call( ld01( $.va( "mouse" ) ), td01( atom ),
                    ld01( $.va( "appActivity" ) ) ) ) ) );
    harness.begin();
    
    return { dom: dom };
}

function makeDelayers( arr ) {
    if ( !(1 <= arr.length && arr.length <= 9) )
        throw new Error();
    return _.objAcc( function ( y ) {
        _.arrEach( arr, function ( startMillis, i ) {
            _.arrEach( arr.slice( i + 1 ), function ( endMillis, j ) {
                var diffMillis = endMillis - startMillis;
                if ( diffMillis <= 0 )
                    throw new Error();
                y( "t" + i + (i + j + 1), function ( type ) {
                    // Delay a type from step i to step (i + j + 1).
                    return typePlusOffsetMillis( diffMillis, type );
                } );
                y( "e" + i + (i + j + 1), function ( expr ) {
                    // Delay a LambdaLangCode expression from step i
                    // to step (i + j + 1).
                    return lambdaLang.delay( diffMillis, expr );
                } );
            } );
        } );
    } );
}

function runLambdaLangConvenient( timeOffsetsMillis, env, body ) {
    if ( "appActivity" in env )
        throw new Error();
    
    timeOffsetsMillis = [ 0 ].concat( timeOffsetsMillis );
    
    var $ = lambdaLang;
    var d = makeDelayers( timeOffsetsMillis );
    var v = {};
    
    var harness = makeConvenientHarness();
    
    var envImpl = makeLambdaLangNameMap();
    _.objOwnEach( env, function ( varName, entry ) {
        envImpl.set( varName, behToCap( entry.beh ) );
        var varInfo = {};
        varInfo.v = $.va( varName );
        _.arrEach( timeOffsetsMillis,
            function ( timeOffsetMillis, i ) {
            
            varInfo[ "c" + i ] = function ( arg ) {
                return $.call(
                    $.delay( timeOffsetMillis, $.va( varName ) ),
                    typePlusOffsetMillis(
                        timeOffsetMillis, entry.earlyInputType ),
                    arg );
            };
        } );
        varInfo.c
        v[ varName ] = varInfo;
    } );
    envImpl.set( "appActivity",
        typeAtom( 0, harness.appActivityInWire ) );
    v[ "appActivity" ] = { v: $.va( "appActivity" ) };
    
    var endMillis = timeOffsetsMillis[ timeOffsetsMillis.length - 1 ];
    var endType = typeAtom( endMillis, harness.appActivityOutWire );
    
    runLambdaLang(
        harness.context,
        envImpl,
        typeAtom( endMillis, harness.appActivityOutWire ),
        _.arrFoldr(
            _.acc( function ( y ) {
                body( $, d, v, function ( var_args ) {
                    _.arrEach( arguments, function ( expr ) {
                        y( expr );
                    } );
                } );
            } ),
            $.delay( endMillis, v.appActivity.v ),
            function ( agent, rest ) {
                return $.fst( endType, $.times( agent, rest ) );
            } )
    );
    harness.begin();
}

function makeTestForLambdaLangConvenient() {
    
    // NOTE: Although we delay the mouse-measurement demand by two
    // seconds, we demand the measurement at the midpoint between our
    // demand and the response, so we actually observe a delay of only
    // half that interval.
    var mouseDelayMillis = 2000;
    var measurementDelayMillis = mouseDelayMillis / 2;
    
    var dom = null;
    
    var atom = typeAtom( 0, null );
    
    runLambdaLangConvenient( [
        measurementDelayMillis,
        mouseDelayMillis
    ], {
        mouse: {
            earlyInputType: atom,
            beh: behMouseQuery()
        },
        dom: {
            earlyInputType: atom,
            beh: behDomDiagnostic( function ( linkMetadata ) {
                // TODO: This is awkward. If this capability is called
                // twice, we'll end up with only one of the DOM
                // elements. Should this use linear types?
                dom = linkMetadata.dom;
            } )
        }
    }, function ( $, d, v, addAgents ) { addAgents(
        v.dom.c2( d.e12( v.mouse.c1( d.e01( v.appActivity.v ) ) ) )
    ); } );
    
    return { dom: dom };
}
