Underreact
==========

Underreact is a framework for continuous reactive programming, using
JavaScript as a runtime platform. David Barbour has been creating a
programming model called RDP (Reactive Demand Programming), and
Underreact is primarily my attempt to implement that vision--not just
to prove it can be done, but to use it in my own projects. I may make
some different choices that stray from what David would like to call
RDP, partly because I still don't completely understand the reasons
for the RDP design.

I've implemented a system for specifying and using a certain subset of
RDP behaviors. This subset is an elegant system in itself, but it has
no dynamic behavior support, and its behaviors are limited to a single
partition.

For the time being, I've been doing tests using two ad hoc I/O
behaviors dedicated to very specific tasks:

* Watch the mouse input.
* Dump a signal to a DOM element for visualization as text.

Now that your expectations are low enough, feel free to take a look at
[some Underreact test code in action](http://rocketnia.github.io/underreact/underreact-dynamic-test.html).

### `behRpc()`

As an experimental way to communicate with outside systems, I model
ambient access to a "membrane" that sends out demands to another
system. This access is in the form of `behRpc`, a kind of yield
operator which can pass a signal of serializable data to the
environment and get another signal of serializable data in response,
very much like a coroutine `yield`.

This direction would be expressive, but RDP is meant to be securable
using object-capability model techniques, and I suspect this mechanism
would encourage developers to lump all their privileges on the ambient
environment rather than using fine-grained control.

### Possible future directions (in no particular order)

* Provide demand monitors.
* Provide resource spaces.
* Provide persistent memory resources.
* Support dynamic evaluation of serialized behaviors.
* Support remote partitions.
* Design a type inference layer, for convenient programming.
* Design a textual syntax, for convenient programming.

I intend for [Era](https://github.com/rocketnia/era), my
meaning-preserving module system, to coexist well with RDP, so Era and
Underreact have some future directions in common:

* Let Era modules describe RDP programs which can be compiled to use
  Underreact.
* Provide an Underreact state resource that represents a set of
  installed [Era](https://github.com/rocketnia/era) modules.
