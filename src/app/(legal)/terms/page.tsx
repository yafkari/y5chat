import Link from "next/link";

export const dynamic = "force-static";

const lastUpdated = "2025-07-05";

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl prose prose-sm prose-gray">
      <h1 className="text-3xl font-bold mb-8">
        <Link href="/" className="text-brand-primary">Y5 Chat</Link> TERMS OF SERVICE
      </h1>
      <p className="text-sm text-gray-600 mb-8">
        Last Updated: {lastUpdated}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. General Terms</h2>
        <p>
          These terms of service ("Terms") govern your access to and use of Y5 Chat's website at https://www.y5.chat and all associated services (collectively, the "Platform"). Y5 Chat is registered in the Central Database for Enterprises under number 1012.168.274 (Belgium Legal Persons Register).
        </p>
        <p className="mt-4">
          By accessing or using our Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not use our Platform.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Age Requirements and Eligibility</h2>
        <p>
          You must be at least 18 years old to use our Platform. If you are accessing or using our Platform on behalf of a company or organization, you warrant that you have the authority to bind that entity to these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Your Account</h2>
        <p>
          To access certain features of our Platform, you must create an account. You agree to:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Provide accurate and complete information when creating your account</li>
          <li>Maintain the security of your account credentials</li>
          <li>Promptly notify us of any unauthorized access to your account</li>
          <li>Take responsibility for all activities that occur under your account</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Platform Usage and Content</h2>
        <p>When using our Platform, you agree not to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe upon intellectual property rights</li>
          <li>Share harmful, offensive, or inappropriate content</li>
          <li>Attempt to circumvent any Platform security measures</li>
          <li>Use the Platform to distribute malware or conduct malicious activities</li>
          <li>Engage in automated data collection without our express permission</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. User Content</h2>
        <p>
          You retain ownership of any content you submit to our Platform ("User Content"). However, by submitting User Content, you grant Y5 Chat a worldwide, non-exclusive, royalty-free license to use, store, and process that content for the purpose of providing and improving our services.
        </p>
        <p className="mt-4">
          You are solely responsible for your User Content and warrant that:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>You own or have the necessary rights to your User Content</li>
          <li>Your User Content does not violate any third-party rights</li>
          <li>Your User Content complies with all applicable laws and regulations</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Service Providers</h2>
        <p>
          Our Platform utilizes various third-party service providers to deliver its functionality:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Infrastructure providers: Vercel, Convex, Upstash, and Cloudflare</li>
          <li>AI technology providers: OpenAI, Google Gemini, and DeepSeek</li>
        </ul>
        <p className="mt-4">
          By using our Platform, you acknowledge and agree to the terms of service and privacy policies of these providers where applicable.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
        <p>
          The Platform, including its original content (excluding User Content), features, and functionality, is owned by Y5 Chat and is protected by international copyright, trademark, and other intellectual property laws.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">8. Privacy and Data Protection</h2>
        <p>
          Your privacy is important to us. Our collection and use of personal information is governed by our <Link href="/privacy" className="text-brand-primary">Privacy Policy</Link>, which is incorporated into these Terms by reference.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Y5 Chat shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Your use or inability to use the Platform</li>
          <li>Any unauthorized access to or use of our servers and/or personal information</li>
          <li>Any interruption or cessation of transmission to or from the Platform</li>
          <li>Any bugs, viruses, or other harmful code that may be transmitted through the Platform</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Platform after such changes constitutes your acceptance of the new Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of Belgium. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Belgium.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
        <p>For any questions about these Terms, please contact us at:</p>
        <p className="mt-2">
          Y5 Chat
          <br />
          Registered in the Central Database for Enterprises
          <br />
          Number 1012.168.274 (Belgium Legal Persons Register)
          <br />
          Email: <a href="mailto:contact@y5.chat" className="text-blue-500">contact@y5.chat</a>
        </p>
      </section>

      <Link href="/privacy" className="text-brand-primary underline underline-offset-4">Privacy Policy</Link>
    </div>
  );
}
