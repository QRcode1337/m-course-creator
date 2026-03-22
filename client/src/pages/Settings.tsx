import { useEffect, useState } from "react";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Loader2, Info } from "lucide-react";

type PreferredProvider = "openai" | "ollama";

type SettingsForm = {
  preferredProvider: PreferredProvider;
  anthropicApiKey: string;
  openaiApiKey: string;
  openrouterApiKey: string;
  grokApiKey: string;
  anthropicModel: string;
  openaiModel: string;
  openrouterModel: string;
  grokModel: string;
};

export default function Settings() {
  const { loading } = useAuth();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const { data: currentSettings, isLoading } = trpc.settings.get.useQuery();
  const [settings, setSettings] = useState<SettingsForm>({
    preferredProvider: "openai",
    anthropicApiKey: "",
    openaiApiKey: "",
    openrouterApiKey: "",
    grokApiKey: "",
    anthropicModel: "",
    openaiModel: "gpt-4o-mini",
    openrouterModel: "",
    grokModel: "",
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings((prev) => ({
        ...prev,
        ...currentSettings,
        preferredProvider: currentSettings.preferredProvider === "ollama" ? "ollama" : "openai",
      }));
    }
  }, [currentSettings]);

  const saveMutation = trpc.settings.update.useMutation();

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your AI provider preferences and API key</p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          MVP is OpenAI-first. Additional providers will be added in later milestones.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Preferred AI Provider</CardTitle>
          <CardDescription>Choose which AI provider to use for course generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select
              value={settings.preferredProvider}
              onValueChange={(value) => setSettings({ ...settings, preferredProvider: value as PreferredProvider })}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>OpenAI API Configuration</CardTitle>
          <CardDescription>Optional: provide your own API key and model</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold">OpenAI</h3>
            <div className="space-y-2">
              <Label htmlFor="openai">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="openai"
                  type={showKeys.openai ? "text" : "password"}
                  placeholder="sk-..."
                  value={settings.openaiApiKey}
                  onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                />
                <Button variant="outline" size="sm" onClick={() => toggleKeyVisibility("openai")}>
                  {showKeys.openai ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openai-model">Model</Label>
              <Input
                id="openai-model"
                value={settings.openaiModel}
                onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
                placeholder="gpt-4o-mini"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
