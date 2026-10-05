# Pantry Lane annotations

Status: In Progress. Review approval pending.

## Q001

What kind of app did I choose for Pantry Lane?

Answer: A kitchen app.

Categories: single-session, singlehop, preference

Evidence:
- D1:1: "I want a kitchen app rather than another game or task manager"

Review: Directly retrieves the requested app category and an explicit preference; no inference is needed.

## Q002

Besides its name, what information does each pantry ingredient need?

Answer: Quantity, unit, storage location, and an optional expiry date.

Categories: single-session, singlehop

Evidence:
- D1:1: "Each item needs a quantity, a unit, a storage location and an optional expiry date."

Review: Retrieves the fields from one explicit requirement; a list of fields is not multi-hop reasoning.

## Q003

Is stock expiring today treated the same as stock that expired yesterday?

Answer: No; today remains usable, while dates before today are expired.

Categories: single-session, singlehop, temporal

Evidence:
- D1:1: "treat a date before today as expired while today remains usable"

Review: The date boundary is stated directly and makes this a temporal question.

## Q004

What language, colors and screen support did I want?

Answer: English, warm cream with dark olive and terracotta accents, and a phone-friendly layout.

Categories: single-session, singlehop, preference

Evidence:
- D1:1: "Keep the interface in English"
- D1:1: "I'd like a warm cream background, dark olive text and restrained terracotta accents, with a layout I can use on my phone too."

Review: All requested choices appear explicitly in one message; preference applies to language and appearance.

## Q005

Which filters should work together when finding ingredients?

Answer: Name search, storage location, and expiry.

Categories: single-session, singlehop

Evidence:
- D1:1: "search names and combine storage-location and expiry filters"

Review: Retrieves the specified combination of search and filters without extra reasoning.

## Q006

How did the D1 verification evidence grow beyond its first implementation report?

Answer: The first report had seven tests and syntax checks; the follow-up added actual browser checks and desktop/mobile screenshots.

Categories: single-session, multihop

Evidence:
- D1:8: "`npm test`: 7 passing tests."
- D1:8: "Preview/browser screenshots were not completed"
- D1:9: "I completed the browser pass on port 4184"
- D1:9: "screenshots are in evidence/D1-desktop.png and D1-mobile.png."

Review: Combines the earlier verification limitation with later evidence; this concerns coverage rather than a time calculation, so no temporal label is added.

## Q007

What two storage risks were found, and how were they addressed?

Answer: An unguarded storage getter could stop rendering, and an empty fallback could overwrite future-format data; guarded access and blocked writes fixed those paths.

Categories: single-session, multihop, knowledge-facts

Evidence:
- D1:9: "reading window.localStorage itself is outside a guard, so a SecurityError from that getter can prevent the page from rendering"
- D1:9: "an unsupported future-version save currently loads an empty list that the next edit can overwrite"
- D1:15: "Guarded browser storage access and retained in-memory usability on storage failures."
- D1:15: "Unsupported or unreadable saved data now blocks writes, preventing replacement of the original payload."

Review: Connects each observed source-level risk to its repair across the request and response; knowledge-facts applies to the persistence behavior.

## Q008

What pantry stock was prepared for the recipe feature, and when do the tomatoes expire?

Answer: Pasta 0.25 kg, Tomatoes 150 g expiring October 3, and Olive oil 100 ml.

Categories: single-session, singlehop, temporal

Evidence:
- D1:9: "I also added Pasta 0.25 kg, Tomatoes 150 g expiring October 3, and Olive oil 100 ml for the next feature."

Review: Retrieves the actual test stock and its explicit expiry date; it does not calculate recipe availability.

## Q009

What quantity input was tightened during the first test repair?

Answer: A blank quantity is rejected instead of being interpreted as zero.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D1:6: "tightening validation so a blank quantity is rejected rather than interpreted as zero"

Review: Retrieves the explicit validation behavior; the repair sequence alone is not temporal reasoning.

## Q010

Why is it useful to keep edits usable in memory when a saved format cannot safely be overwritten?

Answer: It lets someone keep working while protecting the existing saved data from accidental replacement.

Categories: single-session, open-domain

Evidence:
- D1:12: "edits remain functional in memory but writes are deliberately disabled, leaving the original payload intact."

Review: An open explanation grounded in the stated design tradeoff; the answer is one sentence and adds no unsupported implementation claim.

## Q011

What recipe information did I request?

Answer: Name, base servings, ingredient quantities and units, written steps, and cooking minutes.

Categories: single-session, singlehop, preference

Evidence:
- D2:1: "Each recipe needs a name, base servings, ingredient quantities and units, written steps and cooking minutes."

Review: An explicit requested field list is a direct preference, with no reasoning chain.

## Q012

How much Pasta and Olive oil does the Tomato pasta recipe require for four servings?

Answer: 400 g of Pasta and 40 ml of Olive oil.

Categories: single-session, multihop

Evidence:
- D2:1: "a two-serving Tomato pasta recipe could require Pasta 200 g, Tomatoes 300 g and Olive oil 20 ml"

Review: Combines the two-serving baseline with the requested four-serving scenario; applies a factor of two.

## Q013

What is the Tomatoes shortfall for the original two-serving Tomato pasta recipe?

Answer: 150 g.

Categories: single-session, multihop

Evidence:
- D2:1: "Tomatoes 300 g"
- D2:1: "Tomatoes 150 g"

Review: Subtracts available Tomatoes from the recipe requirement. D2 restates both values, so this is not a cross-session question.

## Q014

How long should the example Tomato pasta recipe take to cook?

Answer: 20 minutes.

Categories: single-session, singlehop, temporal

Evidence:
- D2:1: "with a 20-minute cooking time"

Review: The explicitly requested duration supports the temporal label.

## Q015

Which unit conversions should recipe availability support, and which unit remains separate?

Answer: g/kg and ml/L conversions, with pcs kept separate.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D2:1: "convert g/kg and ml/L, and keep pcs separate"

Review: Retrieves the domain conversion rule; it does not infer mass-to-volume equivalence.

## Q016

Which matching pantry items should recipe availability exclude?

Answer: Expired stock and stock in a different unit dimension.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D2:1: "exclude expired items, including matching-name stock in a different unit dimension"

Review: Directly retrieves the matching eligibility rule.

## Q017

Why should repeated ingredients be totaled before comparing a recipe with pantry stock?

Answer: Otherwise several individually affordable lines could together exceed the same available stock.

Categories: single-session, open-domain

Evidence:
- D2:1: "Please total repeated ingredients before comparing with stock"

Review: One-sentence explanatory answer applies general resource accounting to the stated aggregation requirement.

## Q018

Should viewing or scaling a recipe change my pantry quantities?

Answer: No; pantry stock should remain unchanged.

Categories: single-session, singlehop, preference

Evidence:
- D2:1: "Keep stock unchanged when I view or scale a recipe."

Review: An explicit no-consumption preference is directly retrieved.

## Q019

Which floating-point equality case was misclassified, and what result should it have?

Answer: Salt requirements of 0.1 g plus 0.2 g against 0.3 g stock should be sufficient, without a numerical-noise shortfall.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D2:8: "Salt 0.1 g plus Salt 0.2 g against 0.3 g stock"
- D2:19: "Fractional equality now treats `0.1 + 0.2` versus `0.3 g` as sufficient"

Review: The reproduced equality case and expected sufficient result are explicitly stated in D2; the repair is corroborating evidence. Citation count and repair chronology do not make this multi-hop.

## Q020

Which two tiny-quantity failures remained, and which repair addressed each?

Answer: Positive need against zero stock wrongly passed: add a positive-stock guard. 0.0001 displayed as zero: preserve significant digits.

Categories: single-session, multihop, knowledge-facts

Evidence:
- D2:18: "a recipe needing Salt 1e-16 g with no stock returns enough=true"
- D2:18: "formatQuantity(0.0001) returns "0""
- D2:25: "Availability uses magnitude-relative tolerance; zero stock never satisfies a positive requirement."
- D2:25: "Small values now display without rounding `0.0001` to `0`."
- D2:22: "formats small positive quantities with significant-digit precision instead of collapsing them to `0`."

Review: Combines the concrete reproduced comparison and display failures with their matching repairs in the final response; the tiny positive requirement against zero is not described concretely in that final response alone.

## Q021

Which week and two meals did I plan to use for the menu browser check?

Answer: October 5–11, 2026: Monday dinner for four and Wednesday lunch for two, both Tomato pasta.

Categories: single-session, singlehop, temporal, preference

Evidence:
- D3:1: "week October 5–11, 2026: Tomato pasta for Monday dinner with four servings and Wednesday lunch with two servings."

Review: The requested dates and serving choices are explicit; no recipe ingredient calculation is needed.

## Q022

Which meal slots should each day offer?

Answer: Breakfast, lunch, and dinner.

Categories: single-session, singlehop, preference

Evidence:
- D3:1: "breakfast/lunch/dinner slots"

Review: Direct retrieval of the requested daily slots.

## Q023

What should a menu entry store instead of copied ingredient values?

Answer: A saved recipe ID.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D3:1: "Store recipe IDs rather than copied ingredient values"

Review: Direct retrieval of the reference-model rule.

## Q024

Which weekday must start a selected menu week?

Answer: Monday.

Categories: single-session, singlehop, temporal

Evidence:
- D3:1: "choose a week starting on Monday"

Review: A direct calendar boundary question; temporal refers to the weekday requirement.

## Q025

What servings values should planned meals accept?

Answer: Positive whole numbers.

Categories: single-session, singlehop, preference

Evidence:
- D3:1: "positive whole-number servings"

Review: An explicit input constraint stated as a preference.

## Q026

Why are recipe-ID references useful for a weekly menu?

Answer: They let menu names and ingredient totals reflect the current recipe without duplicating stale recipe details.

Categories: single-session, open-domain

Evidence:
- D3:1: "so recipe edits update menu names and aggregated weekly ingredient demand immediately."

Review: One-sentence design explanation grounded in the requested live-reference behavior.

## Q027

How should removal of a recipe already used by a menu be handled?

Answer: Block removal and ask to remove its menu entries first.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D3:1: "Block removal of a recipe that is used by any menu, explain how to remove its menu entries first"

Review: Direct retrieval of the cross-record integrity safeguard.

## Q028

Can a date and meal slot hold multiple planned meals?

Answer: No; one meal per date and slot, with edits used to replace its recipe or servings.

Categories: single-session, singlehop

Evidence:
- D3:1: "one meal per date and slot, with editing to replace its recipe or servings."

Review: Retrieves the explicit collision policy; no reasoning label is added just for listing editing alternatives.

## Q029

What browser evidence confirmed that menu recipe references stayed live and protected?

Answer: Recipe name and ingredient edits updated menu demand immediately, while deletion of the scheduled recipe was blocked.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D3:10: "editing a referenced recipe name and its Pasta amount updated the menu and demand immediately"
- D3:10: "Removal of the scheduled recipe was blocked with the expected explanation."

Review: The completed browser report states both propagation and deletion protection directly. Multiple observations in that one report are not by themselves multi-hop reasoning.

## Q030

By how many pixels did the D3 phone page width decrease after the layout repair?

Answer: 903 pixels, from 1293 to 390.

Categories: single-session, multihop

Evidence:
- D3:10: "at viewport width 390, document scrollWidth was 1293."
- D3:20: "At viewport width 390 the document scrollWidth is now 390"

Review: Subtracts the passing recheck width from the measured initial failure using two genuine inspection reports. This is a layout measurement, not a temporal question merely because there was a before/after repair.

## Q031

How should weekly demand and pantry stock be combined before generating shortages?

Answer: Aggregate demand first, then subtract usable stock once per normalized name and unit dimension.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D4:1: "aggregating its planned recipe demand and subtracting current usable inventory once per normalized ingredient name and unit dimension"

Review: Retrieves the explicitly requested order of arithmetic, preventing stock from being subtracted separately from every meal.

## Q032

What should happen to a saved shopping snapshot when one of its inputs changes?

Answer: Mark it stale; retain quantities and purchase checks until regeneration.

Categories: single-session, singlehop, preference

Evidence:
- D4:1: "clearly mark the snapshot stale and retain its existing values and checks until regeneration"

Review: Direct requested snapshot policy; input changes do not authorize automatic replacement.

## Q033

Should checking a purchased ingredient change pantry quantities?

Answer: No; purchase checks never add to or subtract from inventory.

Categories: single-session, singlehop, preference

Evidence:
- D4:1: "purchase checkboxes that survive reload and never add to or subtract from inventory"

Review: Direct preference about the side effects of a purchase checkbox.

## Q034

Against which date should expiry be evaluated for a future menu week?

Answer: Today’s local date, with today-expiring stock still usable.

Categories: single-session, singlehop, temporal

Evidence:
- D4:1: "Expiry is evaluated against today’s local calendar date, with today still usable; the list is current-stock planning rather than a forecast of freshness on a future meal date."

Review: Distinguishes the calculation date from future meal dates; no future freshness guarantee is inferred.

## Q035

What did canceling versus confirming regeneration do to the checked snapshot in the browser?

Answer: Cancel retained the snapshot and check; confirmation replaced it and cleared checks.

Categories: single-session, singlehop

Evidence:
- D4:16: "cancel kept it, while confirmed regeneration produced 100 g and cleared checks."

Review: Retrieves the two observed confirmation outcomes directly from the browser report, without adding a reasoning label for multiple outcomes.

## Q036

Which columns and escaping rules were required for CSV export?

Answer: Ingredient, Quantity, Unit, Purchased; quote comma/newline fields and double embedded quotation marks.

Categories: single-session, singlehop, knowledge-facts

Evidence:
- D4:1: "Ingredient, Quantity, Unit and Purchased columns, proper comma/quote/newline escaping"
- D4:16: "fields containing comma/newline are quoted, embedded quotation marks are doubled"

Review: Column order is specified in the request; the actual export and direct CSV checks corroborate escaping. Retrieval requires no calculation.

## Q037

How should the app distinguish an ungenerated list from a generated list with no shortage?

Answer: Ungenerated: prompt and disabled export. Fully covered: say the usable pantry covers the week.

Categories: single-session, singlehop

Evidence:
- D4:1: "Before generation show an empty prompt and keep export disabled; a generated list with no shortage should clearly say the usable pantry already covers that week."

Review: Two explicitly different empty states are directly stated together.

## Q038

How much did the Pasta shopping quantity decrease after the temporary stock increase and confirmed regeneration?

Answer: 250 g, from 350 g to 100 g.

Categories: single-session, multihop

Evidence:
- D4:16: "left the old 350 g snapshot and its check intact"
- D4:16: "confirmed regeneration produced 100 g and cleared checks"

Review: Subtracts the regenerated shortage from the retained prior shortage. Both values are from the actual browser experiment.

## Q039

Why retain shopping quantities and purchase checks until regeneration is confirmed?

Answer: It keeps the saved shopping checklist stable while making changed planning inputs visible.

Categories: single-session, open-domain

Evidence:
- D4:1: "clearly mark the snapshot stale and retain its existing values and checks until regeneration"
- D4:1: "Replacing a generated list requires confirmation that clears purchase checks"

Review: One-sentence design explanation grounded in the explicit retained-snapshot and confirmation policies.

## Q040

What refresh behavior should replace the stale-after-midnight gap, including the focus-event wiring repair?

Answer: Date-gated minute, focus and visibility checks; focus calls refresh without forwarding its event.

Categories: single-session, multihop, temporal, knowledge-facts

Evidence:
- D4:5: "an open shopping screen can keep claiming its snapshot is current after midnight"
- D4:17: "Added a date-change guard and refresh hooks for the one-minute timer, window focus, and visible-document events."
- D4:27: "Fixed the D4 focus wiring: it now calls the refresh with no event argument."

Review: Combines the initial clock-related defect with the refresh implementation and subsequent focus repair. The answer is about verified source and simulated tests, not an overnight browser observation.

## Q041

How many baseline Tomato pasta recipe batches do the two planned meals require in total?

Answer: Three baseline batches: (4 + 2) ÷ 2.

Categories: multi-session, multihop

Evidence:
- D2:1: "a two-serving Tomato pasta recipe"
- D3:1: "Tomato pasta for Monday dinner with four servings and Wednesday lunch with two servings."

Review: D2 supplies the two-serving recipe baseline; D3 supplies the distinct scheduled servings. Neither of these sessions alone contains both facts.

## Q042

If I allocate the recorded cooking time once to each of the two planned Tomato pasta meals, how many minutes is that?

Answer: 40 minutes.

Categories: multi-session, multihop, temporal

Evidence:
- D2:1: "with a 20-minute cooking time"
- D3:1: "Tomato pasta for Monday dinner with four servings and Wednesday lunch with two servings."

Review: The conditional calculation uses D2’s per-recipe duration and D3’s two separate meal entries. It is not a claim about how cooking time scales with servings.

## Q043

How many days before the selected menu week’s Monday do the prepared Tomatoes expire?

Answer: Two days: October 3 to October 5, 2026.

Categories: multi-session, multihop, temporal

Evidence:
- D1:9: "Tomatoes 150 g expiring October 3"
- D3:1: "week October 5–11, 2026"

Review: The expiry date is unique to D1 and the selected week is supplied by D3; computes the calendar interval without claiming future inventory availability.

## Q044

Which ingredient filters did I request, and what case behavior was checked for recipe search?

Answer: Ingredient name, storage and expiry filters; case-insensitive recipe search.

Categories: multi-session, multihop

Evidence:
- D1:1: "search names and combine storage-location and expiry filters"
- D2:18: "Recipe edits, case-insensitive search, Keep it"

Review: Requires D1’s specific combined filters and D2’s observed recipe-search behavior. D2’s generic references to preserving inventory filters do not enumerate D1’s criteria.

## Q045

How does the optional inventory date differ from the recipe time field?

Answer: Inventory records an optional expiry date; recipes record cooking minutes.

Categories: multi-session, multihop, knowledge-facts

Evidence:
- D1:1: "an optional expiry date"
- D2:1: "written steps and cooking minutes"

Review: Compares different stored field meanings from D1 and D2. A cooking duration does not stand in for a calendar expiry date.

## Q046

How do the removal safeguards differ for pantry ingredients and recipes referenced by a menu?

Answer: Ingredients require confirmation; referenced recipes are blocked until their menu entries are removed.

Categories: multi-session, multihop, knowledge-facts

Evidence:
- D1:1: "confirm before deleting"
- D3:1: "Block removal of a recipe that is used by any menu, explain how to remove its menu entries first"

Review: D1 provides stock-removal confirmation and D3 provides referential-integrity blocking. D3’s temporary-meal confirmation is not the D1 ingredient removal rule.

## Q047

What total ingredient demand follows from the saved Tomato pasta baseline and the two planned meals?

Answer: Pasta 600 g, Tomatoes 900 g, and Olive oil 60 ml.

Categories: multi-session, multihop

Evidence:
- D2:1: "a two-serving Tomato pasta recipe could require Pasta 200 g, Tomatoes 300 g and Olive oil 20 ml"
- D3:1: "Tomato pasta for Monday dinner with four servings and Wednesday lunch with two servings."

Review: Applies the three-baseline-batch result to D2’s ingredient quantities. D3 reports live updates but does not restate the original recipe quantities; underlying source evidence is retained.

## Q048

How should recipe edits affect weekly demand compared with an already generated shopping snapshot?

Answer: Weekly demand updates immediately; the shopping snapshot stays unchanged and is marked stale.

Categories: multi-session, multihop

Evidence:
- D3:10: "editing a referenced recipe name and its Pasta amount updated the menu and demand immediately"
- D4:16: "Menu changes and referenced-recipe edits also marked the list stale without changing stored values."

Review: D3 supplies immediate derived menu-demand propagation; D4 supplies retained stale snapshot behavior. D4 does not describe the live weekly-demand view and D3 has no shopping snapshot feature.

## Q049

Which stock-preservation rules apply to recipe preview/scaling and shopping purchase checks?

Answer: Neither previewing/scaling recipes nor checking shopping purchases changes inventory.

Categories: multi-session, multihop

Evidence:
- D2:1: "Keep stock unchanged when I view or scale a recipe."
- D4:1: "purchase checkboxes that survive reload and never add to or subtract from inventory"

Review: D2 establishes the side-effect rule for recipe preview and scaling; D4 establishes the independent shopping purchase rule. Neither session explicitly gives both operations.

## Q050

How many more behavior tests passed after the D3 persistence repair than at the end of D1?

Answer: 17 more tests: 25 − 8.

Categories: multi-session, multihop

Evidence:
- D1:15: "`npm test` — 8 passing"
- D3:23: "Validated with `npm test` (25 passed)"

Review: Combines the final D1 and repaired D3 suite counts and subtracts them. This is a coverage-count comparison, not a temporal calculation merely because the features were developed in order.
