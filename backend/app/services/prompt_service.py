def build_prompt(requirement_text, answers):

    prompt = f"Requirement:\n{requirement_text}\n\n"

    prompt += "Details:\n"

    for a in answers:
        prompt += f"- {a.answer_text}\n"

    prompt += "\nGenerate the best solution."

    return prompt