import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Knowsee",
  description: "How Knowsee handles your data and protects your privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Knowsee
        </Link>

        <h1 className="mb-2 font-serif text-4xl text-foreground">Privacy Policy</h1>
        <p className="mb-12 text-sm text-muted-foreground">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-xl font-semibold">Our Commitment</h2>
            <p className="text-muted-foreground">
              Knowsee is built on a simple principle:{" "}
              <strong className="text-foreground">your business stays your business</strong>. We do
              not sell your data. We do not use your data to train AI models. Your information
              exists to serve you, not us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Infrastructure &amp; Data Residency</h2>
            <p className="mb-4 text-muted-foreground">
              Knowsee runs on Google Cloud Platform&apos;s Vertex AI infrastructure. Your data is
              processed and stored within your chosen region and never physically leaves your
              infrastructure — with one necessary exception: when you send a message, the relevant
              context is sent to the configured Large Language Model (LLM) for processing.
            </p>
            <p className="text-muted-foreground">
              This LLM processing is covered by enterprise-grade compliance guarantees. Vertex AI
              maintains{" "}
              <strong className="text-foreground">
                SOC 1/2/3, ISO 27001, ISO 27017, ISO 27018, and GDPR
              </strong>{" "}
              compliance. Data sent to the model is not retained for training and is processed under
              strict contractual obligations.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">LLM Provider Privacy</h2>
            <p className="text-muted-foreground">
              Knowsee uses models available through Vertex AI and its partner ecosystem. The
              privacy practices for AI processing are governed by{" "}
              <a
                href="https://cloud.google.com/terms/cloud-privacy-notice"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Google Cloud&apos;s Privacy Notice
              </a>{" "}
              and the respective policies of any third-party model providers. Vertex AI does not
              use customer data to train models.
            </p>
          </section>

          <section className="rounded-lg border border-border/50 bg-muted/30 p-6">
            <h2 className="mb-3 text-xl font-semibold">Knowsee Secure</h2>
            <p className="mb-4 text-muted-foreground">
              For organisations with the strictest data sovereignty requirements, Knowsee Secure
              provisions a dedicated Google Cloud deployment with{" "}
              <strong className="text-foreground">open-weight models</strong> running entirely
              within your infrastructure.
            </p>
            <p className="text-muted-foreground">
              With Knowsee Secure, your data never leaves your environment — not even for LLM
              processing. The model runs on your compute, in your region, under your control.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">What We Collect</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account information:</strong> Email address and
                authentication credentials.
              </li>
              <li>
                <strong className="text-foreground">Conversation history:</strong> Messages and
                responses, stored to maintain context and provide the service.
              </li>
              <li>
                <strong className="text-foreground">Uploaded documents:</strong> Files you upload
                for analysis, processed and stored according to your organisation&apos;s retention
                settings.
              </li>
              <li>
                <strong className="text-foreground">Usage telemetry:</strong> Feature usage and
                session data to improve the service (no message content).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Third-Party Integrations</h2>
            <p className="text-muted-foreground">
              When you connect Knowsee to external services (Google Drive, BigQuery, web search),
              data flows are governed by those services&apos; respective privacy policies. We access
              only what you explicitly authorise, and credentials are stored securely using
              industry-standard encryption.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Your Rights</h2>
            <p className="mb-4 text-muted-foreground">
              Depending on your jurisdiction, you have rights including:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Access to your personal data</li>
              <li>Correction of inaccurate information</li>
              <li>Deletion of your data</li>
              <li>Data portability</li>
              <li>Objection to processing</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Contact your organisation&apos;s administrator or reach out to us to exercise these
              rights.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this policy as our practices evolve. Material changes will be
              communicated via the service, and the &quot;Last updated&quot; date will be revised
              accordingly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Contact</h2>
            <p className="text-muted-foreground">
              Questions about privacy or data handling? Contact us at{" "}
              <a
                href="mailto:privacy@example.com"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                privacy@example.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
