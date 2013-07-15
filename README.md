Underreact
==========

I'm building a framework for continuous reactive programming,
particularly David Barbour's model "RDP" (Reactive Demand
Programming), using JavaScript as a platform. This repository
represents a few attempts at that goal.

### The latest and greatest attempt

* underreact-dynamic.js
* underreact-static.js
* underreact-dynamic-test.html

I've implemented a full system for specifying and using RDP behaviors.
For now, it has no support for dynamic behaviors or multi-partition
programs, and it has no ambient resource space. It has a couple of ad
hoc I/O behaviors just to make a demo work.

I have some code for conveying continuous demands and responses across
a message-passing protocol, for the purposes of implementing
multi-partition support and resource spaces, but it isn't yet
integrated with the behavior model.

I expect the design of this system to converge toward David Barbour's
ideals for RDP, but I'm allowing myself to take different paths and do
a bit of experimentation along the way. For instance, Underreact lacks
type inference, but it can model more expressive behavior types than
Sirea, since it can use JavaScript values at the type level.

### Old attempts

The files "underreact-rdpio.js" and "underreact-test.html" are an old
attempt to port David Barbour's Haskell code directly. I abandoned
this before completing it, mostly because it was too hard to keep up
with the upstream changes.

The file "graphlang.js" is a JavaScript EDSL for constructing
data-control flow graphs, so that the code to build the data-control
flow graph looks vaguely similar to how the same data-control flow
appears in JavaScript itself. This may come in handy for writing RDP
behavior graphs.
