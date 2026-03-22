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
import { toast } from "sonner";

type PreferredProvider = "openai" | "anthropic" | "xai" | "lmstudio" | "ollama";

type SettingsForm = {
  preferredProvider: PreferredProvider;
  anthropicApiKey: string;
  openaiApiKey: string;
  xaiApiKey: string;
  anthropicModel: string;
  openaiModel: string;
  xaiModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  lmStudioBaseUrl: string;
  lmStudioModel: string;
  lmStudioApiKey: string;
};

export default function Settings() {
  const { loading } = useAuth();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const { data: currentSettings, isLoading } = trpc.settings.get.useQuery();
  const [settings, setSettings] = useState<SettingsForm>({
      preferredProvider: "openai",
      anthropicApiKey: "",
      openaiApiKey: "",
      xaiApiKey: "",
      anthropicModel: "",
      openaiModel: "gpt-4o-mini",
      xaiModel: "",
      ollamaBaseUrl: "http://127.0.0.1:11434",
      ollamaModel: "llama3.1:8b",
      lmStudioBaseUrl: "http://localhost:1234/v1",
      lmStudioModel: "local-model",
      lmStudioApiKey: "",
    });

  useEffect(() => {
    if (currentSettings) {
      setSettings((prev) => ({
        ...prev,
        ...currentSettings,
        preferredProvider: ["openai", "anthropic", "xai", "lmstudio", "ollama"].includes(currentSettings.preferredProvider)
          ? (currentSettings.preferredProvider as PreferredProvider)
          : "openai",
      }));
    }
  }, [currentSettings]);

  const saveMutation = trpc.settings.update.useMutation();
  const testMutation = trpc.settings.testProvider.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || "Provider test failed");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
    saveMutation.reset();
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
          Provider routing now supports OpenAI, Anthropic, xAI Grok, LM Studio, and Ollama.
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
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="xai">xAI (Grok)</SelectItem>
                <SelectItem value="lmstudio">LM Studio</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Provider Configuration</CardTitle>
          <CardDescription>Configure credentials and model selection for each provider</CardDescription>
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

          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold">Anthropic (Claude)</h3>
            <div className="space-y-2">
              <Label htmlFor="anthropic">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="anthropic"
                  type={showKeys.anthropic ? "text" : "password"}
                  placeholder="sk-ant-..."
                  value={settings.anthropicApiKey}
                  onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                />
                <Button variant="outline" size="sm" onClick={() => toggleKeyVisibility("anthropic")}>
                  {showKeys.anthropic ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anthropic-model">Model</Label>
              <Input
                id="anthropic-model"
                value={settings.anthropicModel}
                onChange={(e) => setSettings({ ...settings, anthropicModel: e.target.value })}
                placeholder="claude-sonnet-4-20250514"
              />
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold">xAI (Grok)</h3>
            <div className="space-y-2">
              <Label htmlFor="xai">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="xai"
                  type={showKeys.xai ? "text" : "password"}
                  placeholder="xai-..."
                  value={settings.xaiApiKey}
                  onChange={(e) => setSettings({ ...settings, xaiApiKey: e.target.value })}
                />
                <Button variant="outline" size="sm" onClick={() => toggleKeyVisibility("xai")}>
                  {showKeys.xai ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="xai-model">Model</Label>
              <Input
                id="xai-model"
                value={settings.xaiModel}
                onChange={(e) => setSettings({ ...settings, xaiModel: e.target.value })}
                placeholder="grok-4.20-beta-latest-non-reasoning"
              />
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold">LM Studio</h3>
            <div className="space-y-2">
              <Label htmlFor="lmstudio-base">Base URL</Label>
              <Input
                id="lmstudio-base"
                value={settings.lmStudioBaseUrl}
                onChange={(e) => setSettings({ ...settings, lmStudioBaseUrl: e.target.value })}
                placeholder="http://localhost:1234/v1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lmstudio-model">Model</Label>
              <Input
                id="lmstudio-model"
                value={settings.lmStudioModel}
                onChange={(e) => setSettings({ ...settings, lmStudioModel: e.target.value })}
                placeholder="your-loaded-model"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lmstudio-key">API Key (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="lmstudio-key"
                  type={showKeys.lmstudio ? "text" : "password"}
                  placeholder="Optional token"
                  value={settings.lmStudioApiKey}
                  onChange={(e) => setSettings({ ...settings, lmStudioApiKey: e.target.value })}
                />
                <Button variant="outline" size="sm" onClick={() => toggleKeyVisibility("lmstudio")}>
                  {showKeys.lmstudio ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-semibold">Ollama</h3>
            <div className="space-y-2">
              <Label htmlFor="ollama-base">Base URL</Label>
              <Input
                id="ollama-base"
                value={settings.ollamaBaseUrl}
                onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                placeholder="http://127.0.0.1:11434"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ollama-model">Model</Label>
              <Input
                id="ollama-model"
                value={settings.ollamaModel}
                onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                placeholder="llama3.1:8b"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => testMutation.mutate(settings)}
          disabled={testMutation.isPending}
        >
          {testMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Test Provider
        </Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
