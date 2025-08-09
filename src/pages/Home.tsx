import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen">
      <Navigation />
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
        <div className="container mx-auto px-4 pt-32 pb-32 relative">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <Badge variant="secondary" className="px-4 py-2 text-sm font-medium animate-bounce">
                In development haha
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight animate-fade-in">
                Flip Roblox Items Like a Pro
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up">
                The most advanced platform for trading and flipping Roblox items. 
                Join thousands of traders maximizing their profits with coinflips and smart trades.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>Verified as @{user?.robloxName}</span>
                  </div>
                  <Button 
                    onClick={() => navigate("/coinflips")} 
                    size="lg" 
                    className="glow-button text-lg px-8 py-6"
                  >
                    Go to Coinflips
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button 
                    onClick={() => navigate("/verify")} 
                    size="lg" 
                    className="glow-button text-lg px-8 py-6 animate-pulse-glow"
                  >
                    Start Trading
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg px-8 py-6 border-border/50"
                  >
                    Learn More
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
                <span>Instant Trades</span>
              </div>
              <div className="flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
                <span>Secure Coinflips</span>
              </div>
              <div className="flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
                <span>Real-Time Values</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
