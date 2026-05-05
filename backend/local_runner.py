#!/usr/bin/env python3
"""Simple CLI runner that loads a HF model with transformers and performs text generation.

Usage:
  python3 backend/local_runner.py --model distilgpt2 --prompt-file /tmp/prompt.txt

This will print the generated text to stdout.
"""
import argparse
import sys


def main():
    parser = argparse.ArgumentParser(description="Local HF text-generation runner")
    parser.add_argument("--model", default="distilgpt2", help="HF model id to load")
    parser.add_argument("--prompt-file", help="File containing prompt")
    parser.add_argument("--max-new-tokens", type=int, default=128)
    parser.add_argument("--temperature", type=float, default=1.0, help="Sampling temperature")
    parser.add_argument("--do-sample", action="store_true", help="Enable sampling (otherwise deterministic)")
    args = parser.parse_args()

    try:
        from transformers import pipeline
    except Exception as e:
        print("ERROR: transformers not installed:", e, file=sys.stderr)
        sys.exit(2)

    prompt = ""
    if args.prompt_file:
        try:
            with open(args.prompt_file, "r", encoding="utf-8") as f:
                prompt = f.read()
        except Exception as e:
            print("ERROR: could not read prompt file:", e, file=sys.stderr)
            sys.exit(3)
    else:
        print("ERROR: no prompt file provided", file=sys.stderr)
        sys.exit(4)

    try:
        # Prefer text2text-generation for seq2seq models (T5, FLAN), fallback to text-generation
        try:
            gen = pipeline("text2text-generation", model=args.model)
            out = gen(
                prompt,
                max_new_tokens=args.max_new_tokens,
                do_sample=args.do_sample,
                temperature=args.temperature,
            )
        except Exception:
            gen = pipeline("text-generation", model=args.model)
            out = gen(
                prompt,
                max_new_tokens=args.max_new_tokens,
                do_sample=args.do_sample,
                temperature=args.temperature,
            )
        # out is typically a list with one dict containing 'generated_text'
        if isinstance(out, list) and out:
            text = out[0].get("generated_text") or str(out[0])
        else:
            text = str(out)
        print(text)
    except Exception as e:
        print("ERROR: generation failed:", e, file=sys.stderr)
        sys.exit(5)


if __name__ == "__main__":
    main()
