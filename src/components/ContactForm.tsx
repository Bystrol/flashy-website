import { type FormEvent, useState } from "react";

interface FormErrors {
  email?: string;
  message?: string;
  agreed?: string;
}

export default function ContactForm() {
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (form: FormData): FormErrors => {
    const errs: FormErrors = {};
    const email = form.get("email") as string;
    const message = form.get("message") as string;

    if (!email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email.";
    }

    if (!message.trim()) {
      errs.message = "Message is required.";
    }

    if (!agreed) {
      errs.agreed = "You must accept the Terms of Service and Privacy Policy.";
    }

    return errs;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const errs = validate(formData);

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[359px] items-center justify-center">
        <p className="text-h5 font-weight-h5 text-white-white leading-[--text-h5--line-height]">
          Thank you! We&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3">
        {/* Name */}
        <input
          type="text"
          name="name"
          placeholder="Name"
          className="contact-input"
        />

        {/* Email */}
        <div className="flex flex-col gap-1">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className={`contact-input ${errors.email ? "!border-red" : ""}`}
          />
          {errors.email && (
            <span className="text-small-body font-weight-small-body text-red leading-[--text-small-body--line-height]">
              {errors.email}
            </span>
          )}
        </div>

        {/* Message */}
        <div className="flex flex-col gap-1">
          <textarea
            name="message"
            placeholder="Message"
            className={`contact-input min-h-[215px] resize-none ${errors.message ? "!border-red" : ""}`}
          />
          {errors.message && (
            <span className="text-small-body font-weight-small-body text-red leading-[--text-small-body--line-height]">
              {errors.message}
            </span>
          )}
        </div>
      </div>

      {/* Bottom row: checkbox + submit */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={agreed}
            onClick={() => {
              setAgreed((prev) => !prev);
              setErrors((prev) => ({ ...prev, agreed: undefined }));
            }}
            className={`flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
              agreed
                ? "border-orange bg-orange"
                : errors.agreed
                  ? "border-red bg-white-white-5"
                  : "border-grey-grey-30 bg-white-white-5"
            }`}
          >
            {agreed && (
              <svg
                viewBox="0 0 12 10"
                fill="none"
                className="size-3"
                aria-hidden="true"
              >
                <path
                  d="M1 5L4.5 8.5L11 1.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <span className={`text-body font-weight-body leading-[--text-body--line-height] tracking-[--text-body--letter-spacing] ${errors.agreed ? "text-red" : "text-white-white-60"}`}>
            I accept Terms of Service and Privacy Policy.
          </span>
        </label>

        <button
          type="submit"
          className="bg-orange flex items-center justify-between rounded-[500px] py-1.5 pl-5 pr-1.5"
        >
          <span className="text-body-semibold font-weight-body-semibold text-white-white pr-4 leading-[--text-body-semibold--line-height]">
            Send Email
          </span>
          <span className="flex items-center justify-center rounded-full bg-white p-[6.5px]">
            <svg viewBox="0 0 24 24" fill="none" className="size-[17px]">
              <path
                d="M10 5C10 5.742 10.733 6.85 11.475 7.78C12.429 8.98 13.569 10.027 14.876 10.826C15.856 11.425 17.044 12 18 12M18 12C17.044 12 15.855 12.575 14.876 13.174C13.569 13.974 12.429 15.021 11.475 16.219C10.733 17.15 10 18.26 10 19M18 12H5.99995"
                stroke="black"
                strokeWidth="2"
              />
            </svg>
          </span>
        </button>
      </div>
    </form>
  );
}
