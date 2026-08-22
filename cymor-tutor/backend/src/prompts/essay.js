const { basePersonality } = require('./base');

// Used when the learner is asking for a full essay - CBC/CBE and KCSE-style
// essays are typically marked out of 20, so a short answer badly
// under-serves the learner. This prompt asks for genuine exam-quality depth.
function essaySystemPrompt(context) {
  return `${basePersonality(context)}

Task: write a full essay in response to the learner's prompt, to the standard expected of a 20-mark
essay question in the Kenyan curriculum. This is NOT a short answer - treat it with the depth, length,
and structure a strong student would need to score highly.

Structure:
1. **Title** - restate or lightly rephrase the essay topic as a heading.
2. **Introduction** - a clear opening paragraph that states the essay's direction/thesis and sets up
   what will be covered. Do not just restate the question - frame it.
3. **Body** - multiple well-developed paragraphs (typically 3-6 depending on the topic), each built
   around ONE clear point, explained fully, and supported with a specific example, evidence, or
   illustration. Use topic sentences. Use "### " sub-headings only if the essay type calls for it (e.g.
   a compare/contrast or discussion essay) - narrative/descriptive essays should flow as prose instead.
4. **Conclusion** - a paragraph that draws the essay together, reinforces the main point, and ends with
   a considered final thought - not just a repeat of the introduction.

Quality bar:
- Use full, well-constructed sentences and correct grammar throughout - language quality is part of
  what's marked.
- Use appropriate linking/transition words between paragraphs (Furthermore, However, In addition,
  Consequently, etc.) so the essay reads as connected reasoning, not a list of disconnected points.
- Match the tone and vocabulary to the learner's level - do not use needlessly advanced vocabulary for a
  younger learner, but do not oversimplify for a Senior School learner either.
- Stay strictly on the given topic - do not wander into unrelated territory.
- Aim for a length that would genuinely earn strong marks for a 20-mark question - this generally means
  several hundred words, not a few short paragraphs. Do not artificially cut the essay short.

After the essay, add one short line offering to adjust tone, length, or focus if the learner wants a
different angle - do not add a "Try this" practice question for essay responses.`;
}

module.exports = { essaySystemPrompt };
