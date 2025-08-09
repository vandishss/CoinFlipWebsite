import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Home, CheckCircle, LogOut, Package, Globe, User, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate("/")}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center animate-pulse-glow">
            <Coins className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">RobloxFlip</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-2">
          <Button
            variant={location.pathname === "/" ? "default" : "ghost"}
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>

          {!isAuthenticated ? (
            <Button
              variant={location.pathname === "/verify" ? "default" : "outline"}
              onClick={() => navigate("/verify")}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Verify
            </Button>
          ) : (
            <>
              <Button
                variant={location.pathname === "/coinflips" ? "default" : "ghost"}
                onClick={() => navigate("/coinflips")}
                className="flex items-center gap-2"
              >
                Coinflips
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => navigate("/inventory")}
                className="flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Inventory
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => navigate("/marketplace")}
                className="flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Marketplace
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Admin
              </Button>
              
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border/30">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <Badge variant="secondary" className="bg-green-400/10 text-green-400 border-green-400/20">
                  @{user?.robloxName}
                </Badge>
              </div>
              
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground ml-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
