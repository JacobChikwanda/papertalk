'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Settings, Volume2, Upload, CheckCircle2 } from 'lucide-react'
import { getAvailableVoices, updateVoicePreferences, cloneVoice } from '@/actions/voice'

async function fetchUser() {
  const res = await fetch('/api/user')
  if (!res.ok) {
    throw new Error('Failed to fetch user')
  }
  return res.json()
}

export function TeacherSettingsView() {
  const queryClient = useQueryClient()
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('')
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [voiceName, setVoiceName] = useState('')

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
  })

  const { data: voicesData, isLoading: voicesLoading } = useQuery({
    queryKey: ['voices'],
    queryFn: () => getAvailableVoices(),
    enabled: true,
  })

  const updateVoiceMutation = useMutation({
    mutationFn: (voiceId: string) => updateVoicePreferences(voiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      alert('Voice preference updated successfully!')
    },
  })

  const cloneVoiceMutation = useMutation({
    mutationFn: () => {
      if (!voiceFile) throw new Error('No file selected')
      return cloneVoice(voiceFile, voiceName || 'My Voice')
    },
    onSuccess: (result) => {
      if (result.success && result.voiceId) {
        setSelectedVoiceId(result.voiceId)
        queryClient.invalidateQueries({ queryKey: ['user'] })
        queryClient.invalidateQueries({ queryKey: ['voices'] })
        alert('Voice cloned successfully!')
        setVoiceFile(null)
        setVoiceName('')
      } else {
        alert(result.error || 'Failed to clone voice')
      }
    },
  })

  useEffect(() => {
    if (user?.voiceId) {
      setSelectedVoiceId(user.voiceId)
    }
  }, [user])

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  // Categorize voices by gender
  const maleVoices = voicesData?.voices?.filter((v: any) => 
    v.gender === 'male' || v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('adam') || v.name.toLowerCase().includes('antoni')
  ) || []
  const femaleVoices = voicesData?.voices?.filter((v: any) => 
    v.gender === 'female' || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('rachel') || v.name.toLowerCase().includes('domi')
  ) || []
  const otherVoices = voicesData?.voices?.filter((v: any) => 
    !maleVoices.includes(v) && !femaleVoices.includes(v)
  ) || []

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage your voice preferences and profile settings
        </p>
      </div>

      {/* Voice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Settings
          </CardTitle>
          <CardDescription>
            Choose your voice for audio feedback or clone your own voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Voice Status */}
          {user?.voiceId && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Using cloned voice: {user.voiceId}
                </p>
              </div>
            </div>
          )}

          {/* Voice Cloning */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Clone Your Voice</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Upload an audio sample (1-5 minutes) to create a personalized voice for feedback
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="voiceName">Voice Name (Optional)</Label>
                <Input
                  id="voiceName"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="My Voice"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="voiceFile">Audio File</Label>
                <Input
                  id="voiceFile"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setVoiceFile(file)
                    }
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Recommended: Clear audio, 1-5 minutes, MP3 or WAV format
                </p>
              </div>
              <Button
                onClick={() => cloneVoiceMutation.mutate()}
                disabled={!voiceFile || cloneVoiceMutation.isPending}
                className="w-full"
              >
                {cloneVoiceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cloning Voice...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Clone Voice
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Voice Selection */}
          {voicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-lg font-semibold">Select Voice</h3>
              
              {/* Female Voices */}
              {femaleVoices.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Female Voices</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {femaleVoices.slice(0, 6).map((voice: any) => (
                      <Button
                        key={voice.id}
                        variant={selectedVoiceId === voice.id ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedVoiceId(voice.id)
                          updateVoiceMutation.mutate(voice.id)
                        }}
                        disabled={updateVoiceMutation.isPending}
                        className="justify-start"
                      >
                        {voice.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Male Voices */}
              {maleVoices.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Male Voices</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {maleVoices.slice(0, 6).map((voice: any) => (
                      <Button
                        key={voice.id}
                        variant={selectedVoiceId === voice.id ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedVoiceId(voice.id)
                          updateVoiceMutation.mutate(voice.id)
                        }}
                        disabled={updateVoiceMutation.isPending}
                        className="justify-start"
                      >
                        {voice.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Voices */}
              {otherVoices.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Other Voices</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {otherVoices.slice(0, 4).map((voice: any) => (
                      <Button
                        key={voice.id}
                        variant={selectedVoiceId === voice.id ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedVoiceId(voice.id)
                          updateVoiceMutation.mutate(voice.id)
                        }}
                        disabled={updateVoiceMutation.isPending}
                        className="justify-start"
                      >
                        {voice.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

