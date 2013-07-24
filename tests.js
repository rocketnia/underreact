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
// TODO: Reimplement resources in terms of makeLinkedSigPair objects
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
    
    var pair = makeLinkedMembranePair( now, deferForBatching );
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
    
    var pair = makeLinkedMembranePair( now, deferForBatching );
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

function convenientlyInstallBehavior( delayMillis, beh ) {
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
    beh.install(
        {
            startMillis: nowMillis,
            membrane: membranePair.b.membrane,
            onBegin: onBeginObj.onBegin
        },
        typeAtom( 0, step1.readable ),
        typeAtom( delayMillis, step2.writable )
    );
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
            [], nowMillis, nowMillis + stabilityMillis );
        membranePair.a.membrane.raiseOtherOutPermanentUntilMillis(
            nowMillis + otherOutStabilityMillis );
        membranePair.b.membrane.raiseOtherOutPermanentUntilMillis(
            nowMillis + otherOutStabilityMillis );
    }, intervalMillis );
}

function makeTestForBehaviors() {
    // NOTE: Although we delay the mouse-measurement demand by two
    // seconds, we demand the measurement at the midpoint between our
    // demand and the response, so we actually observe a delay of only
    // half that interval.
    var mouseDelayMillis = 2000;
    var measurementDelayMillis = mouseDelayMillis / 2;
    
    var dom = null;
    
    convenientlyInstallBehavior( mouseDelayMillis, behSeqs(
        behDelay( measurementDelayMillis, typeAtom( 0, null ) ),
        behMouseQuery(),
        behDelay( mouseDelayMillis - measurementDelayMillis,
            typeAtom( 0, null ) ),
        behDomDiagnostic( function ( linkMetadata ) {
            dom = linkMetadata.dom;
        } )
    ) );
    
    return { dom: dom };
}