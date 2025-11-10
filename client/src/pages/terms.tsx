import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href="/signup">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign Up
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Terms and Conditions</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using TradePro ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground">
                TradePro is a stock trading analysis platform that provides real-time portfolio tracking, AI-powered analysis based on SEC filings and market data, automated trading rules, backtesting capabilities, and insider trading alerts. The Service integrates data from third-party sources including Alpha Vantage, Finnhub, OpenAI, and Telegram.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. No Investment Advice</h2>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 my-4">
                <p className="font-semibold text-destructive mb-2">IMPORTANT DISCLAIMER:</p>
                <p className="text-muted-foreground">
                  TradePro is provided for informational and educational purposes only. The Service does NOT provide investment advice, financial advice, trading advice, or any other sort of advice. All information, analysis, recommendations, and data provided through the Service are for informational purposes only and should not be considered as financial or investment advice.
                </p>
              </div>
              <p className="text-muted-foreground">
                You should not make any investment decision based solely on information provided by TradePro. Before making any investment decisions, you should seek independent professional advice from a licensed financial advisor.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  TradePro and its operators shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages resulting from your use of the Service, including but not limited to trading losses, loss of profits, loss of data, or business interruption.
                </li>
                <li>
                  You acknowledge that stock trading involves substantial risk of loss and that you are solely responsible for all trading decisions made based on information from the Service.
                </li>
                <li>
                  TradePro makes no warranties or representations about the accuracy, reliability, completeness, or timeliness of the content, data, analysis, or recommendations provided through the Service.
                </li>
                <li>
                  Past performance data provided through backtesting or historical analysis does not guarantee future results.
                </li>
                <li>
                  AI-generated analysis and recommendations are based on algorithmic processing and may contain errors, inaccuracies, or be based on incomplete data.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Third-Party Data Sources</h2>
              <p className="text-muted-foreground">
                The Service relies on data from third-party providers including Alpha Vantage, Finnhub, OpenAI, and Telegram. TradePro is not responsible for the accuracy, reliability, or availability of third-party data. Service interruptions or data inaccuracies from these providers may affect the Service's functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Subscription and Payments</h2>
              <p className="text-muted-foreground mb-3">
                Access to TradePro requires a paid subscription. Subscription fees cover:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Connections to managed premium data services (Alpha Vantage, Finnhub, OpenAI)</li>
                <li>Secure deployment infrastructure and hosting</li>
                <li>Ongoing platform maintenance and updates</li>
                <li>Customer support</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Subscription fees are non-refundable except as required by law. You may cancel your subscription at any time through PayPal, but no refunds will be provided for partial subscription periods.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. User Responsibilities</h2>
              <p className="text-muted-foreground mb-3">
                By using the Service, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the Service in compliance with all applicable laws and regulations</li>
                <li>Not share your account with others</li>
                <li>Conduct your own due diligence before making any investment decisions</li>
                <li>Understand that you are solely responsible for your trading and investment decisions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Risk Acknowledgment</h2>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 my-4">
                <p className="text-muted-foreground">
                  You acknowledge and understand that trading stocks and securities involves a high degree of risk and can result in the loss of all your invested capital. You should only invest money that you can afford to lose. TradePro is not responsible for any losses you may incur from trading decisions made using information from the Service.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Data Privacy</h2>
              <p className="text-muted-foreground">
                TradePro collects and processes personal information as described in our Privacy Policy. By using the Service, you consent to such processing and warrant that all data provided by you is accurate. We use industry-standard security measures to protect your data, but cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content, features, and functionality of the Service, including but not limited to text, graphics, logos, software, and data compilations, are the property of TradePro or its licensors and are protected by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Service Modifications</h2>
              <p className="text-muted-foreground">
                TradePro reserves the right to modify, suspend, or discontinue the Service (or any part thereof) at any time with or without notice. We are not liable to you or any third party for any modification, suspension, or discontinuance of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including but not limited to breach of these Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which TradePro operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">14. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by updating the "Last Updated" date at the top of this page. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">15. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us through the support channels provided in the application.
              </p>
            </section>

            <div className="bg-muted/50 rounded-lg p-6 mt-8">
              <p className="text-sm text-muted-foreground">
                By clicking "I accept the Terms and Conditions" during signup, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button asChild data-testid="button-back-to-signup">
            <Link href="/signup">
              Back to Sign Up
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
