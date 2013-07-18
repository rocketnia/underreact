
var pathResolvers = {};
function fexprEval( env, expr ) {
    return env[ expr[ 0 ] ].apply( { eval: function ( expr ) {
        return fexprEval( env, expr );
    } }, expr.slice( 1 ) );
}

function Edge() {}
Edge.prototype.init = function ( name ) {
    this.path_ = [ "edge", name ];
    this.name_ = name;  // TODO: Use this.
    this.top_ = new End().initForEdge( this, false );
    this.bot_ = new End().initForEdge( this, true );
    return this;
};
Edge.prototype.toPath = function () {
    return this.name_;
};
Edge.prototype.top = function () {
    return this.top_;
};
Edge.prototype.bot = function () {
    return this.bot_;
};
Edge.prototype.mustBot = function () {
    return this.bot_;
};
Edge.prototype.mustTop = function () {
    return this.top_;
};
Edge.prototype.shouldBot = function () {
    return this.bot_;
};
Edge.prototype.shouldTop = function () {
    return this.top_;
};
function End() {}
End.prototype.init_ = function ( path,
    edge, edgePolarity, parent, name, parentPolarity, goesBot ) {
    
    this.path_ = path;
    
    // TODO: Use these.
    this.edge_ = edge;
    this.edgePolarity_ = edgePolarity;
    this.parent_ = parent;
    this.name_ = name;
    this.parentPolarity_ = parentPolarity;
    this.goesBot_ = goesBot;
    
    this.tur_ = new StringMap().init();
    this.wid_ = new StringMap().init();
    this.flow_ = new Flow().init( this );
    this.spray_ = new Spray().init( this );
    return this;
};
End.prototype.initForEdge = function ( edge, polarity ) {
    return this.init_( [ "edgeEnd", polarity, edge.toPath() ],
        edge, polarity, null, null, null, polarity );
};
pathResolvers[ "edgeEnd" ] = function ( polarity, edge ) {
    edge = this.eval( edge );
    return polarity ? edge.bot(), edge.top();
};
End.prototype.initForParent = function ( parent, name, polarity ) {
    return this.init_( [ "subEnd", polarity, name, parent.toPath() ],
        null, null, parent, name, polarity,
        parent.goesBot() === polarity );
};
pathResolvers[ "subEnd" ] = function ( polarity, name, parent ) {
    parent = this.eval( parent );
    return polarity ? parent.tur( name ), parent.wid( name );
};
End.prototype.toPath = function () {
    return this.path_;
};
End.prototype.goesBot = function () {
    return this.goesBot_;
};
End.prototype.goesTop = function () {
    return !this.goesBot();
};
End.prototype.mustBot = function () {
    if ( !this.goesBot() )
        throw new Error();
    return this;
};
End.prototype.mustTop = function () {
    if ( !this.goesTop() )
        throw new Error();
    return this;
};
End.prototype.shouldBot = function () {
    return this;
};
End.prototype.shouldTop = function () {
    return this;
};
End.prototype.tur = function ( name ) {
    if ( !this.tur_.has( name ) )
        this.tur_.put( name,
            new End().initForParent( this, name, true ) );
    return this.tur_.get( name );
};
End.prototype.wid = function ( name ) {
    if ( !this.wid_.has( name ) )
        this.wid_.put( name,
            new End().initForParent( this, name, false ) );
    return this.wid_.get( name );
};
End.prototype.flow = function () {
    return this.flow_;
};
End.prototype.spray = function () {
    return this.spray_;
};
function Flow() {}
Flow.prototype.init = function ( end ) {
    this.path_ = [ "flow", end.toPath() ];
    this.end_ = end;  // TODO: Use this.
    return this;
};
pathResolvers[ "flow" ] = function ( end ) {
    return this.eval( end ).flow();
};
Flow.prototype.toPath = function () {
    return this.path_;
};
Flow.prototype.end = function () {
    return this.end_;
};
function Spray() {}
Spray.prototype.init = function ( end ) {
    this.path_ = [ "spray", end.toPath() ];
    this.end_ = end;  // TODO: Use this.
    return this;
};
pathResolvers[ "spray" ] = function ( end ) {
    return this.eval( end ).spray();
};
Spray.prototype.toPath = function () {
    return this.path_;
};
Spray.prototype.end = function () {
    return this.end_;
};

GraphCounter() {}
GraphCounter.prototype.init = function () {
    this.edges_ = [];
    this.hooksFlowToFlow_ = {};
    this.hooksSprayToFlow_ = {};
    this.taken_ = {};
    return this;
};
GraphCounter.prototype.resolvePath_ = function ( path ) {
    var self = this;
    return fexprEval(
        _.shadow( pathResolvers, { "edge": function ( name ) {
            return self.edges_[ name ];
        } ) );
};
GraphCounter.prototype.makeEdge = function () {
    var result = new Edge().init( this.edges_.length );
    this.edges_.push( result );
    return result;
};
GraphCounter.prototype.hook = function ( flowA, flowB ) {
    if ( flowA.goesBot() === flowB.goesBot() )
        throw new Error();
    flowA = flowA.toPath();
    flowB = flowB.toPath();
    var nameA = JSON.stringify( flowA );
    var nameB = JSON.stringify( flowB );
    if ( this.taken_[ nameA ] || this.taken_[ nameB ] )
        throw new Error();
    this.taken_[ nameA ] = this.taken_[ nameB ] = 1;
    this.hooksFlowToFlow_[ JSON.stringify( [ flowA, flowB ] ) ] = 1;
};
GraphCounter.prototype.hookSpray = function ( spray, flow ) {
    if ( spray.goesBot() === flow.goesBot() )
        throw new Error();
    spray = spray.toPath();
    flow = flow.toPath();
    var nameSpray = JSON.stringify( spray );
    var nameFlow = JSON.stringify( flow );
    if ( this.taken_[ nameSpray ] || this.taken_[ nameFlow ] )
        throw new Error();
    this.taken_[ nameFlow ] = 1;
    this.hooksSprayToFlow_[ JSON.stringify( [ spray, flow ] ) ] = 1;
};
GraphCounter.prototype.capSpray = function ( spray ) {
    // TODO: See if it would be better to throw an error in the case
    // of a duplicated cap.
    this.taken_[ JSON.stringify( spray.toPath() ) ] = 1;
};

function arityfn( func ) {
    return function ( opt_arity, body ) {
        if ( body === void 0 ) {
            body = opt_arity;
            opt_arity = body.length;
        }
        return func.call( this, opt_arity, body );
    };
}

function GraphDsl() {}
GraphDsl.prototype.init = function () {
    return this;
};
GraphDsl.prototype.call = function ( fn, var_args ) {
    var c = this.counter_;
    var result = c.makeEdge();
    fn = fn.shouldBot();
    c.hook( result.top().wid( "val" ).flow(),
        fn.tur( "val" ).tur( "val" ).flow() );
    var fnInput = fn.tur( "val" ).wid( "val" ).spray();
    _.each( _.cut( arguments, 1 ), function ( arg ) {
        c.hookSpray( fnInput, arg.shouldBot().tur( "val" ).flow() );
    } );
    c.capSpray( fnInput );
    return result.bot();
};
GraphDsl.prototype.edge = function () {
    return this.counter_.makeEdge();
};
GraphDsl.prototype.edges = arityfn( function ( arity, body ) {
    var self = this;
    return body.apply( null, _.numMap( arity, function () {
        return self.edge();
    } ) );
} );
GraphDsl.prototype.syntacticfn = function ( i, o ) {
    var c = this.counter_;
    var result = c.makeEdge();
    c.hook( result.top().wid( "val" ).wid( "val" ).flow(),
        i.shouldTop() );
    c.hook( result.top().wid( "val" ).tur( "val" ).flow(),
        o.shouldBot() );
    return result.bot();
};

GraphDsl.prototype.w = function ( destructure, restructure ) {
    var self = this;
    this.counter_.hook( this.match( function () {
        return self.edges( destructure );
    } ).shouldTop(), restructure.shouldBot() );
    
    // TODO
};


// (= plus (fn (start) (fn () (= start (+ start 1)))))
var counter = $.globalvar( "counter" );
var plus = $.globalvar( "plus" );
_.pushBody( $.assign( _.captured( counter ),
    $.lambda( function ( _ ) {
    
    var start = _.popArg();
    _.pushBody( $.lambda( function ( _ ) {
        _.pushBody( $.assign( _.captured( start ),
            $.call( _.captured( plus ),
                _.captured( start ), $.literal( 1 ) ) ) );
    } ) );
} ) ) );



var counter = $.g( "counter" );
var plus = $.g( "plus" );
return $.assign( _.cPlace( counter ), $.fn( _, function ( _ ) {
    var start = _.local();
    return [ [ start ], $.fn( _, function ( _ ) {
        return [ [], $.assign( _.cPlace( start ),
            $.call( _.c( plus ), _.c( start ), $.lit( 1 ) ) ) ];
    } ) ];
} ) );


function SchemelikeDsl() {}
SchemelikeDsl.prototype.init = function () {
    return this;
};
SchemelikeDsl.prototype.g = function ( name ) {
    return { op: "global", of: [ name ] };
};
SchemelikeDsl.prototype.assign = function ( to, from ) {
    return { op: "assign", of: [ to, from ] };
};
SchemelikeDsl.prototype.fn = function ( parentScope, scopeBody ) {
    var renameMap = parentScope.renameCaptures( scopeBody );
    
    return { op: "fn", of: [ renameMap scopeBody( parentScope.[ to, from ] };
};




function ReactDsl() {}
ReactDsl.prototype.init = function () {
    return this.initSub( null );
};
ReactDsl.prototype.initSub = function ( parent ) {
    this.parent_ = parent;
    this.id_ = parent === null ? "_" : parent.childId();
    this.children_ = 0;
    this.nodes_ = 0;
    this.startNode_ = this.node();
    this.finishNode_ = null;
    this.edgeTypes_ = {};
    this.graph_ = [];
    return this;
};
ReactDsl.prototype.childId = function () {
    return this.id_ + "_" + (this.children_++);
};
ReactDsl.prototype.takeVal = function ( input ) {
    if ( input.graphId === this.id_ )
        return input.nodeId;
    if ( !this.freeVars_[ input.nodeId ] )
        this.freeVars_[ input.nodeId ] = this.node();
    return this.freeVars_[ input.nodeId ].nodeId;
};
ReactDsl.prototype.node = function () {
    return { graphId: this.id_,
        nodeId: this.id_ + "$" + (this.nodes_++) };
};
ReactDsl.prototype.freeVars = function () {
    var freeVars = this.freeVars_;
    return { map: function ( func ) {
        var result = {};
        for ( var k in freeVars )
            result[ freeVars[ k ].nodeId ] = func( k );
        return result;
    } };
};
ReactDsl.prototype.graph = function () {
    // TODO: See if the graph should be a separate thing in its own
    // right.
    return this;
};
ReactDsl.prototype.param = function () {
    return this.startNode_;
};
ReactDsl.prototype.call = function ( a, b ) {
    a = this.takeVal( a );
    b = this.takeVal( b );
    var result = this.node();
    this.graph_.push( [ "call", a, b, result.nodeId ] );
    return result;
};
ReactDsl.prototype.fn = function ( body ) {
    var subdsl = new ReactDsl().initSub( this );
    subdsl.finish( body( subdsl ) );
    var result = this.node();
    var self = this;
    var freeVars = subdsl.freeVars().map( function ( v ) {
        return self.takeVal( freeVars );
    } );
    this.graph_.push(
        [ "fn", freeVars, subdsl.graph(), result.nodeId ] );
    return result;
};
ReactDsl.prototype.when = function ( cond, then, els ) {
    cond = this.takeVal( cond );
    then = this.takeVal( then );
    els = this.takeVal( els );
    var result = this.node();
    this.graph_.push( [ "if", cond, then, els, result.nodeId ] );
    return result;
};


