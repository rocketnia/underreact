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
RDP behaviors. This subset is an elegant system in itself, but its
first-class behaviors are limited to a small, hardcoded library, and
all its behaviors are limited to a single partition.

Most of the time, I've been doing tests using two ad hoc I/O behaviors
behaviors dedicated to very specific tasks:

* Watch the mouse input.
* Dump a signal to a DOM element for visualization as text.

You can see these non-flashy tests here:

* [test/tests.html](http://rocketnia.github.io/underreact/test/tests.html).

And now there's a slightly less ramshackle test here, which shows a
box that follows the cursor:

* [test/canvas.html](http://rocketnia.github.io/underreact/test/canvas.html).

### `behClosure()` and `behCall()`

Underreact does not yet have Sirea's `beval` for dynamic behaviors,
but it does have first-class behaviors of a different sort. Invoking
one of these behaviors, using `behCall`, will not perform implicit
synchronization or communication at run time--but it may result in
some initial setup at compile time or load time. The `behClosure`
operator can create a first-class behavior with custom internal code
and an encapsulated signal (suitable for implementing a syntax with
lexical closures). Underreact will use these tools as an efficient
basis for modeling capabilities, including resource spaces.

Programs built up using `behClosure` and `behCall` will essentially be
fully inlined before execution begins. Even if it were possible to
express a recursive program using these tools (and it isn't!), it
would only grow divergently, and execution would never be able to
start.

### `behYield()`

As an experimental way to communicate with outside systems, Underreact
models ambient access to a "membrane" that sends out demands to
another system. This access is in the form of `behYield`, an operator
which can pass a signal of serializable data to the environment and
get another signal of serializable data in response, very much like a
coroutine.

This direction would be expressive, but RDP is meant to be securable
using object-capability model techniques, and I suspect this mechanism
would encourage developers to lump all their privileges on the ambient
environment rather than using fine-grained control. I therefore
recommend trying to use `behYield` only in conjunction with
`behClosure`, so that it's a first-class capability.

### Possible future directions (in no particular order)

* Provide resource spaces.
* Provide persistent memory resources.
* Turn demand monitors into managed resources.
* Support dynamic evaluation of serialized behaviors (`beval`).
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
