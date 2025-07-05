import Link from "next/link";

export const dynamic = "force-static";

const lastUpdated = "2025-07-05";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl prose prose-sm prose-gray">
      <h1 className="text-3xl font-bold mb-8"><Link href="/" className="text-brand-primary">Y5 Chat</Link> PRIVACY POLICY</h1>
      <p className="text-sm text-gray-600 mb-8">
        Last Updated: {lastUpdated}
        <br />
        Effective Date: 2025-07-05
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Overview and Scope</h2>
        <p>
          Welcome to Y5 Chat's Privacy Policy. This document outlines our commitment to protecting your privacy and explains how we handle your personal information. Y5 Chat, registered in the Central Database for Enterprises under number 1012.168.274 (Belgium Legal Persons Register), operates the website accessible at https://y5.chat and its associated services (collectively referred to as the "Platform").
        </p>
        <p className="mt-4">
          By accessing or using our Platform, you acknowledge that you have read and understood this Privacy Policy. If you disagree with any aspect of this policy, we kindly ask you to refrain from using our services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Information Collection Practices</h2>
        <p>
          To provide you with our services, we collect various types of information through different channels:
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">2.1 Direct User Interactions</h3>
        <p>When engaging with Y5 Chat, you may provide us with:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Chat conversations and prompts submitted to our AI services</li>
          <li>Documents, images, and files you choose to upload</li>
          <li>Feedback and support requests</li>
          <li>Account registration details</li>
        </ul>

        <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Technical Data Collection</h3>
        <p>Our systems automatically gather:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Device specifications (operating system, browser type, device identifiers)</li>
          <li>Usage patterns and interaction metrics</li>
          <li>IP address and approximate location (city/country level)</li>
          <li>Performance and error data</li>
        </ul>

        <h3 className="text-xl font-semibold mt-4 mb-2">2.3 Cookies and Similar Technologies</h3>
        <p>
          We employ cookies and related technologies to enhance your experience. These tools help us:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Maintain your session security</li>
          <li>Remember your preferences</li>
          <li>Analyze platform performance</li>
          <li>Improve our services based on usage patterns</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Purpose of Data Processing</h2>
        <p>Your information enables us to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Deliver and maintain our core services</li>
          <li>Enhance platform security and prevent abuse</li>
          <li>Analyze and improve performance</li>
          <li>Communicate important updates</li>
          <li>Provide customer support</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p className="mt-4">
          <strong>Important Note:</strong> We do not use your conversations or uploaded content to train AI models.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Service Providers and Data Processing</h2>
        <p>
          To deliver our services effectively, we collaborate with carefully selected service providers. Each provider processes specific aspects of your data under strict confidentiality and security requirements:
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">4.1 Infrastructure and Hosting</h3>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>Vercel:</strong> Hosts our web application and provides content delivery services
            <br />
            Privacy policy: <a className="text-blue-500" href="https://vercel.com/legal/privacy-policy">https://vercel.com/legal/privacy-policy</a>
          </li>
          <li>
            <strong>Convex:</strong> Manages our database and real-time synchronization
            <br />
            Privacy policy: <a className="text-blue-500" href="https://www.convex.dev/privacy">https://www.convex.dev/privacy</a>
          </li>
          <li>
            <strong>Upstash:</strong> Provides caching and queue management services
            <br />
            Privacy policy: <a className="text-blue-500" href="https://upstash.com/privacy">https://upstash.com/privacy</a>
          </li>
          <li>
            <strong>Cloudflare:</strong> Delivers content and provides security services
            <br />
            Privacy policy: <a className="text-blue-500" href="https://www.cloudflare.com/privacypolicy">https://www.cloudflare.com/privacypolicy</a>
          </li>
        </ul>

        <h3 className="text-xl font-semibold mt-4 mb-2">4.2 AI Technology Providers</h3>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>OpenAI:</strong> Powers certain AI chat functionalities
            <br />
            Privacy policy: <a className="text-blue-500" href="https://openai.com/policies/privacy-policy">https://openai.com/policies/privacy-policy</a>
          </li>
          <li>
            <strong>Google Gemini:</strong> Provides additional AI capabilities
            <br />
            Privacy policy: <a className="text-blue-500" href="https://policies.google.com/privacy">https://policies.google.com/privacy</a>
          </li>
          <li>
            <strong>DeepSeek:</strong> Delivers specialized AI features
            <br />
            Privacy policy: <a className="text-blue-500" href="https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html">https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html</a>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Your Privacy Rights</h2>
        <p>Under applicable data protection laws, you have the right to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Access your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Request data deletion</li>
          <li>Object to certain processing activities</li>
          <li>Export your data in a portable format</li>
          <li>Withdraw consent for optional processing</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Data Security Measures</h2>
        <p>
          We implement industry-standard security measures to protect your information, including:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Encryption of data in transit and at rest</li>
          <li>Regular security assessments</li>
          <li>Access controls and authentication</li>
          <li>Monitoring for suspicious activities</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. International Data Transfers</h2>
        <p>
          While Y5 Chat is based in Belgium and operates under Belgian law, our service providers may process data in various locations globally. We ensure appropriate safeguards are in place for these international transfers, complying with European data protection requirements.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">8. Age Restrictions</h2>
        <p>
          Our services are not designed for or directed at individuals under 18 years of age. We do not knowingly collect or maintain information from children. If we become aware that we have inadvertently collected such information, we will take steps to delete it.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes through our Platform or via email.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
        <p>For privacy-related inquiries or to exercise your rights, please contact us at:</p>
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


      <Link href="/terms" className="text-brand-primary underline underline-offset-4">Terms of service</Link>
    </div>
  );
}
