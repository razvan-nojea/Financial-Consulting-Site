import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../contexts/auth-context";

type SettingsTab = "profile" | "security" | "notifications";

interface NotificationPreferences {
  emailAppointments: boolean;
  emailNewsletter: boolean;
  smsAppointments: boolean;
  smsReminders: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  emailAppointments: true,
  emailNewsletter: true,
  smsAppointments: false,
  smsReminders: true,
};

function splitName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function toPositiveNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getNotificationsStorageKey(email: string) {
  return `account-notifications:${email.toLowerCase()}`;
}

function readNotifications(email: string): NotificationPreferences {
  const raw = localStorage.getItem(getNotificationsStorageKey(email));
  if (!raw) {
    return DEFAULT_NOTIFICATIONS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      emailAppointments:
        typeof parsed.emailAppointments === "boolean"
          ? parsed.emailAppointments
          : DEFAULT_NOTIFICATIONS.emailAppointments,
      emailNewsletter:
        typeof parsed.emailNewsletter === "boolean"
          ? parsed.emailNewsletter
          : DEFAULT_NOTIFICATIONS.emailNewsletter,
      smsAppointments:
        typeof parsed.smsAppointments === "boolean"
          ? parsed.smsAppointments
          : DEFAULT_NOTIFICATIONS.smsAppointments,
      smsReminders:
        typeof parsed.smsReminders === "boolean"
          ? parsed.smsReminders
          : DEFAULT_NOTIFICATIONS.smsReminders,
    };
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

function writeNotifications(email: string, notifications: NotificationPreferences) {
  localStorage.setItem(
    getNotificationsStorageKey(email),
    JSON.stringify(notifications)
  );
}

export function AccountSettings() {
  const { user, updateUser, changePassword } = useAuth();
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    totalSalary: "0",
    investmentGoal: "0",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATIONS
  );

  const fullName = useMemo(() => {
    const nextName = `${profileData.firstName} ${profileData.lastName}`.trim();
    return nextName || user?.name || "";
  }, [profileData.firstName, profileData.lastName, user?.name]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get("tab");
    const savedTab = queryTab ?? localStorage.getItem("accountSettingsTab");

    if (
      savedTab === "profile" ||
      savedTab === "security" ||
      savedTab === "notifications"
    ) {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("accountSettingsTab", activeTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeTab]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const { firstName, lastName } = splitName(user.name);
    setProfileData({
      firstName,
      lastName,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      totalSalary: String(user.totalSalary),
      investmentGoal: String(user.investmentGoal),
    });
    setNotifications(readNotifications(user.email));
  }, [user]);

  const handleProfileSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    updateUser({
      ...user,
      name: fullName,
      phone: profileData.phone.trim(),
      bio: profileData.bio.trim(),
      totalSalary: toPositiveNumber(profileData.totalSalary),
      investmentGoal: toPositiveNumber(profileData.investmentGoal),
    });

    toast.success("Profilul a fost actualizat cu succes!");
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Parolele noi nu se potrivesc.");
      return;
    }

    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    if (!result.success) {
      toast.error(result.message ?? "Parola nu a putut fi schimbată.");
      return;
    }

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    toast.success("Parola a fost schimbată cu succes!");
  };

  const handleNotificationsSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    writeNotifications(user.email, notifications);
    toast.success("Preferințele de notificări au fost salvate!");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Setări cont</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Actualizează datele profilului și păstrează informațiile importante în același loc.
        </p>
      </div>

      <div ref={tabsContainerRef}>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const nextTab = value as SettingsTab;
            setActiveTab(nextTab);
            tabsContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User size={16} />
              <span>Profil</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Lock size={16} />
              <span>Securitate</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell size={16} />
              <span>Notificări</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="dark:border-gray-800 dark:bg-[#1a1a1a]">
              <CardHeader>
                <CardTitle className="dark:text-white">Informații personale</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">Prenume</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(event) => {
                          setProfileData((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }));
                        }}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nume</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(event) => {
                          setProfileData((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }));
                        }}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profileData.email}
                      readOnly
                      className="mt-2 cursor-not-allowed bg-gray-100 dark:bg-[#101010]"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Emailul rămâne același pentru a păstra istoricul programărilor.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(event) => {
                          setProfileData((current) => ({
                            ...current,
                            phone: event.target.value,
                          }));
                        }}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="salary">Venit total</Label>
                      <Input
                        id="salary"
                        type="number"
                        min="0"
                        value={profileData.totalSalary}
                        onChange={(event) => {
                          setProfileData((current) => ({
                            ...current,
                            totalSalary: event.target.value,
                          }));
                        }}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="investmentGoal">Obiectiv investiții</Label>
                    <Input
                      id="investmentGoal"
                      type="number"
                      min="0"
                      value={profileData.investmentGoal}
                      onChange={(event) => {
                        setProfileData((current) => ({
                          ...current,
                          investmentGoal: event.target.value,
                        }));
                      }}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Despre tine</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(event) => {
                        setProfileData((current) => ({
                          ...current,
                          bio: event.target.value,
                        }));
                      }}
                      rows={4}
                      placeholder="Poți adăuga câteva detalii despre obiectivele tale financiare."
                      className="mt-2"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Salvează modificările</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="dark:border-gray-800 dark:bg-[#1a1a1a]">
              <CardHeader>
                <CardTitle className="dark:text-white">Schimbă parola</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="currentPassword">Parola curentă</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(event) => {
                        setPasswordData((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }));
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Parolă nouă</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(event) => {
                        setPasswordData((current) => ({
                          ...current,
                          newPassword: event.target.value,
                        }));
                      }}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Minimum 8 caractere.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(event) => {
                        setPasswordData((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }));
                      }}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Actualizează parola</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="dark:border-gray-800 dark:bg-[#1a1a1a]">
              <CardHeader>
                <CardTitle className="dark:text-white">Preferințe notificări</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNotificationsSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {[
                      {
                        key: "emailAppointments" as const,
                        title: "Confirmări programări",
                        description: "Primești email când creezi sau modifici o programare.",
                      },
                      {
                        key: "emailNewsletter" as const,
                        title: "Newsletter",
                        description: "Primești sfaturi și actualizări despre planificare financiară.",
                      },
                      {
                        key: "smsAppointments" as const,
                        title: "SMS pentru programări",
                        description: "Primești SMS la confirmarea programărilor importante.",
                      },
                      {
                        key: "smsReminders" as const,
                        title: "Mementouri",
                        description: "Primești mementouri cu 24h înainte de consultație.",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          checked={notifications[item.key]}
                          onCheckedChange={(checked) => {
                            setNotifications((current) => ({
                              ...current,
                              [item.key]: checked,
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Salvează preferințele</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
