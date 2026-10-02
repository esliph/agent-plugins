# The six EARS patterns, one by one

Each section gives the shape, an example that passes, the pattern it is usually
confused with, and the mistake most often made. In the examples, `Checkout` is
the system and `[[coupon]]` is a marked term of the vocabulary.

## Ubiquitous

`THE <system> SHALL <response>`

> THE Checkout SHALL show the total with taxes included.

Holds always. There is no keyword before `THE`.

- **Confused with State.** If the sentence is only true "while" something, it is
  State. Ubiquitous has no exception hiding in the reader's head.
- **Usual mistake.** Using it for a quality with no measure: "THE Checkout SHALL
  be fast". A quality needs its number and its condition, and usually becomes an
  Event or a State criterion once they are written.

## Event

`WHEN <trigger>, THE <system> SHALL <response>`

> WHEN the customer confirms the order, THE Checkout SHALL send a receipt to the
> customer's e-mail within 60 seconds.

A response to something that happens at a moment.

- **Confused with Unwanted.** If the trigger is something going wrong, it is
  Unwanted. Ask: is this the path the story wants, or the path it fears?
- **Usual mistake.** Two triggers: "WHEN the customer confirms and WHEN the
  payment clears". One of them is a state — write it as `WHILE` — or these are
  two criteria.

## State

`WHILE <state>, THE <system> SHALL <response>`

> WHILE the cart is empty, THE Checkout SHALL keep the pay button disabled.

Holds for as long as the state lasts, and stops holding when it ends.

- **Confused with Event.** "WHEN the cart becomes empty" is the moment;
  "WHILE the cart is empty" is the duration. If the response must be undone when
  the state ends, it is State.
- **Usual mistake.** A state nobody can observe: "WHILE the system is healthy".
  Name the state by what defines it.

## Unwanted

`IF <condition>, THEN THE <system> SHALL <response>`

> IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it and show
> "Coupon expired".

The response to an error, a fault, an invalid input or a misuse. It is the only
pattern with two keywords before the system: `IF` and `THEN`.

- **Confused with Event.** See above. A story whose criteria are all Event has
  not said what happens when things fail.
- **Usual mistake.** A response that is not a behavior: "THEN THE Checkout SHALL
  handle the error". Say what the observer sees: the message, the state the data
  is left in, whether the operation can be retried.

The failures worth asking about for almost any success: the input is invalid,
a dependency does not answer, the permission is denied, the time runs out, the
same request arrives twice.

## Optional

`WHERE <feature>, THE <system> SHALL <response>`

> WHERE gift wrapping is enabled, THE Checkout SHALL offer it before payment.

Holds only in the configurations, editions or installations that have the
feature.

- **Confused with State.** A feature is there or not for the whole life of an
  installation; a state comes and goes while the system runs.
- **Usual mistake.** Using `WHERE` for a location or a screen: "WHERE the
  customer is on the cart page". That is a state.

## Complex

More than one clause before the system, always in this order: `WHERE`, then
`WHILE`, then `WHEN` or `IF … THEN`.

> WHILE the customer is signed in, WHEN the customer adds an item, THE Checkout
> SHALL save the cart to the customer's account.

> WHERE loyalty points are enabled, IF the points balance cannot be read, THEN
> THE Checkout SHALL show the order total without points.

- **Confused with two criteria.** If each clause leads to its own response,
  these are two criteria. Complex is one response that needs both conditions.
- **Usual mistake.** The clauses out of order, or a `WHEN` together with an
  `IF`. An unwanted condition inside an event is written as its own criterion.
  Either fold the event into the condition — "IF the payment is declined while
  the order is being confirmed, THEN …", which is Unwanted — or keep the event as
  a state: "WHILE the order is being confirmed, IF …", which has two clauses and
  is therefore Complex.

## The body in the language of the project

Only the keywords are English. The rest is written as the team speaks:

> IF o [[cupom]] estiver expirado, THEN THE Checkout SHALL rejeitá-lo e exibir
> "Cupom expirado".

The system name and the marked terms are written exactly as the vocabulary of
the project has them, in whatever language that is.

## In the spec

A requirement is a level-3 heading with its ID and its pattern, then the
criterion:

```markdown
### CHK-014 [Unwanted]

IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it and show "Coupon expired".
```

The pattern in the heading is the one the sentence has. The ID is never typed
from memory or guessed from the last one in the file: it is allocated.
