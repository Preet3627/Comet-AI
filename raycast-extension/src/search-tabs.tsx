import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Tab {
    id: string;
    title: string;
    url: string;
    isActive: boolean;
}

export default function SearchTabs() {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTabs();
    }, []);

    async function loadTabs() {
        try {
            // Communicate with Comet Browser via AppleScript or IPC
            // For now, using a simple approach
            const { stdout } = await execAsync(
                `osascript -e 'tell application "Comet" to get tabs'`
            );

            // Parse the response
            const tabsData = JSON.parse(stdout);
            setTabs(tabsData);
        } catch (error) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to load tabs",
                message: "Make sure Comet Browser is running",
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function switchToTab(tabId: string) {
        try {
            await execAsync(
                `osascript -e 'tell application "Comet" to activate tab "${tabId}"'`
            );
            await showToast({
                style: Toast.Style.Success,
                title: "Switched to tab",
            });
        } catch (error) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to switch tab",
            });
        }
    }

    async function closeTab(tabId: string) {
        try {
            await execAsync(
                `osascript -e 'tell application "Comet" to close tab "${tabId}"'`
            );
            await loadTabs(); // Reload tabs
            await showToast({
                style: Toast.Style.Success,
                title: "Tab closed",
            });
        } catch (error) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to close tab",
            });
        }
    }

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Search tabs...">
            {tabs.map((tab) => (
                <List.Item
                    key={tab.id}
                    title={tab.title}
                    subtitle={tab.url}
                    icon={tab.isActive ? "✓" : ""}
                    accessories={[
                        { text: tab.isActive ? "Active" : "" },
                    ]}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Switch to Tab"
                                onAction={() => switchToTab(tab.id)}
                            />
                            <Action
                                title="Close Tab"
                                onAction={() => closeTab(tab.id)}
                                shortcut={{ modifiers: ["cmd"], key: "w" }}
                            />
                            <Action.CopyToClipboard
                                title="Copy URL"
                                content={tab.url}
                                shortcut={{ modifiers: ["cmd"], key: "c" }}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}
