import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Loader2, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

type VerificationStep = "input" | "generate" | "verify";

export default function RobloxVerification() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<VerificationStep>("input");
  const [robloxId, setRobloxId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [robloxUser, setRobloxUser] = useState<RobloxUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateCode = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `AH | ${randomCode}`;
  };

  const fetchRobloxUser = async (userId: string): Promise<RobloxUser | null> => {
    try {
      // Using a CORS proxy to bypass CORS restrictions
      const proxyUrl = `https://corsproxy.io/?https://users.roblox.com/v1/users/${userId}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching Roblox user:", error);
      return null;
    }
  };

  const handleStartVerification = async () => {
    if (!robloxId.trim()) {
      toast({
        title: "Invalid Roblox ID",
        description: "Please enter a valid Roblox ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const user = await fetchRobloxUser(robloxId);
    if (!user) {
      toast({
        title: "User not found",
        description: "Could not find a Roblox user with that ID",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setRobloxUser(user);
    setVerificationCode(generateCode());
    setStep("generate");
    setLoading(false);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(verificationCode);
    setCopied(true);
    toast({
      title: "Code copied!",
      description: "Verification code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyCode = async () => {
    if (!robloxUser) return;
    
    setLoading(true);
    
    const updatedUser = await fetchRobloxUser(robloxUser.id.toString());
    if (!updatedUser) {
      toast({
        title: "Verification failed",
        description: "Could not fetch your profile",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (updatedUser.description.includes(verificationCode)) {
      // Save user data to authentication context
      let token: string | undefined = undefined;
      try {
        const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:3001";
        const resp = await fetch(`${apiBase}/auth/issue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: updatedUser.id.toString(),
            robloxId: updatedUser.id.toString(),
            robloxName: updatedUser.name,
            displayName: updatedUser.displayName,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          token = data.token;
        }
      } catch (e) {
        console.error("Failed to obtain auth token:", e);
      }

      login({
        id: updatedUser.id.toString(),
        robloxId: updatedUser.id.toString(),
        robloxName: updatedUser.name,
        displayName: updatedUser.displayName,
        isVerified: true,
        token,
      });
      
                    toast({
                title: "Account verified successfully!",
                description: "Welcome to RobloxFlip! Redirecting to trading...",
              });
              // Redirect to coinflips page after successful verification
      setTimeout(() => {
        navigate("/coinflips");
      }, 1500);
    } else {
      toast({
        title: "Code not found",
        description: "The verification code was not found in your profile description",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const resetVerification = () => {
    setStep("input");
    setRobloxId("");
    setVerificationCode("");
    setRobloxUser(null);
    setCopied(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {step === "input" && (
          <Card className="glass-card animate-fade-in">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold animate-fade-in">Account Verification</CardTitle>
              <CardDescription className="animate-slide-up">
                Verify your Roblox account to start trading and flipping items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="roblox-id" className="text-sm font-medium">
                  Roblox User ID
                </label>
                <Input
                  id="roblox-id"
                  type="number"
                  placeholder="Enter your Roblox ID..."
                  value={robloxId}
                  onChange={(e) => setRobloxId(e.target.value)}
                  className="bg-input/50 border-border/50 focus:border-primary transition-colors"
                />
              </div>
              <Button
                onClick={handleStartVerification}
                disabled={loading || !robloxId.trim()}
                className="w-full glow-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Start Trading Setup"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "generate" && robloxUser && (
          <Card className="glass-card animate-slide-up">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl font-bold">User Found!</CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="text-sm">
                  @{robloxUser.name}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Copy this code and add it to your Roblox profile description:
                </p>
                <div className="relative">
                  <div className="bg-secondary/50 border border-border/50 rounded-lg p-4 font-mono text-lg text-center animate-pulse-glow">
                    {verificationCode}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    className="absolute top-2 right-2 h-8 w-8"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => setStep("verify")}
                  className="w-full glow-button"
                >
                  I've Added the Code
                </Button>
                <Button
                  onClick={resetVerification}
                  variant="outline"
                  className="w-full"
                >
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "verify" && (
          <Card className="glass-card animate-slide-up">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-warning to-warning/80 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-warning-foreground animate-spin" />
              </div>
              <CardTitle className="text-xl font-bold">Verification</CardTitle>
              <CardDescription>
                We'll check your profile for the verification code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Make sure you've added this code to your profile description:
                </p>
                <Badge variant="outline" className="font-mono">
                  {verificationCode}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={verifyCode}
                  disabled={loading}
                  className="w-full glow-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking Profile...
                    </>
                  ) : (
                    "Verify Now"
                  )}
                </Button>
                <Button
                  onClick={() => setStep("generate")}
                  variant="outline"
                  className="w-full"
                >
                  Back to Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


      </div>
    </div>
  );
}