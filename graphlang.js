var t = {};
t.neg = function ( type ) {
    return { type: "neg", of: type };
};
t.any_ = { type: "any" };
t.any = function () {
    return t.any_;
};
t.cap = function ( aka, opt_of ) {
    if ( opt_of === void 0 )
        opt_of = t.any();
    return { type: "cap", aka: aka, of: opt_of };
};
t.key = function ( key, val ) {
    return { type: "key", k: key, v: val };
};
t.named = function ( name ) {
    return t.key( name, t.any() );
};
var tVal = t.named( "val" );
var tnVal = t.neg( tVal );
var v = {};
v.call = function ( fn, var_args ) {
    return magic( function ( hook ) {
        _.each( _.cut( arguments, 1 ), function ( arg ) {
            hook( fn.bot().key( "val" ).neg().key( "val" ),
                arg.top().key( "val" ) );
        } );
    } );
    var fnEnd = fn.bot( t.key( "val", t.cap( "v" ) );
    var fn
    var fnEnd = fn.bot();
    var argTops = _.map( _.cut( arguments, 1 ), function ( arg ) {
        return arg.top();
    } );
    this.addNode_( [
        [ fn.bot(), v
        [ t.neg( "type" )
        fn.getOut( "val" ),
    ] );
};

function mo

o.call( foo, a, b, c )







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
End.prototype.mustBot = function () {
    return this.bot_;
};
End.prototype.mustTop = function () {
    return this.top_;
};
End.prototype.shouldBot = function () {
    return this.bot_;
};
End.prototype.shouldTop = function () {
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
