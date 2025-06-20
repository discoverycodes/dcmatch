using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

public class GameManager : MonoBehaviour
{
    [Header("Game Settings")]
    public int gridWidth = 4;
    public int gridHeight = 4;
    public float cardSpacing = 1.2f;
    public float flipDuration = 0.5f;
    
    [Header("Prefabs")]
    public GameObject cardPrefab;
    public Transform cardsParent;
    
    [Header("UI")]
    public Text scoreText;
    public Text timerText;
    public Text balanceText;
    public Button playButton;
    public GameObject gameOverPanel;
    public Text finalScoreText;
    
    [Header("Audio")]
    public AudioSource audioSource;
    public AudioClip cardFlipSound;
    public AudioClip matchSound;
    public AudioClip winSound;
    
    // Game State
    private List<Card> cards = new List<Card>();
    private List<Card> flippedCards = new List<Card>();
    private List<int> cardValues = new List<int>();
    
    private int score = 0;
    private int matches = 0;
    private float gameTime = 0f;
    private bool gameActive = false;
    private bool canFlip = true;
    
    // API Integration
    private string apiBaseUrl = "http://localhost:5000/api";
    private string authToken = "";
    private float userBalance = 0f;
    private float betAmount = 10f;

    private void Start()
    {
        InitializeGame();
        GetUserBalance();
    }

    private void Update()
    {
        if (gameActive)
        {
            gameTime += Time.deltaTime;
            UpdateTimer();
        }
    }

    private void InitializeGame()
    {
        // Get auth token from browser
        authToken = GetAuthTokenFromBrowser();
        
        // Setup UI
        playButton.onClick.AddListener(StartNewGame);
        UpdateUI();
    }

    public void OnCardClicked(Card card)
    {
        if (!gameActive || !canFlip || card.IsFlipped || flippedCards.Contains(card))
            return;
            
        // Flip card
        card.Flip();
        flippedCards.Add(card);
        
        // Play sound
        PlaySound(cardFlipSound);
        
        // Check if we have two flipped cards
        if (flippedCards.Count == 2)
        {
            canFlip = false;
            StartCoroutine(CheckMatch());
        }
    }

    private IEnumerator CheckMatch()
    {
        yield return new WaitForSeconds(flipDuration);
        
        bool isMatch = flippedCards[0].CardValue == flippedCards[1].CardValue;
        
        if (isMatch)
        {
            // Match found
            matches++;
            score += 100;
            PlaySound(matchSound);
            
            // Add visual effects
            foreach (Card card in flippedCards)
            {
                card.SetMatched();
            }
            
            // Check win condition
            if (matches == cardValues.Count / 2)
            {
                GameWon();
            }
        }
        else
        {
            // No match - flip back
            foreach (Card card in flippedCards)
            {
                card.FlipBack();
            }
        }
        
        flippedCards.Clear();
        canFlip = true;
        UpdateUI();
    }

    private void GameWon()
    {
        gameActive = false;
        PlaySound(winSound);
        
        // Calculate final score
        int timeBonus = Mathf.Max(0, 300 - (int)gameTime) * 10;
        int finalScore = score + timeBonus;
        
        // Send result to server
        StartCoroutine(SubmitGameResult(finalScore));
    }

    private void StartNewGame()
    {
        if (userBalance < betAmount)
        {
            ShowMessage("Saldo insuficiente para jogar!");
            return;
        }
        
        // Deduct bet amount
        StartCoroutine(CreateGameSession());
    }

    private IEnumerator CreateGameSession()
    {
        WWWForm form = new WWWForm();
        form.AddField("betAmount", betAmount.ToString());
        
        using (UnityEngine.Networking.UnityWebRequest www = UnityEngine.Networking.UnityWebRequest.Post(apiBaseUrl + "/game/create-session", form))
        {
            www.SetRequestHeader("Authorization", "Bearer " + authToken);
            
            yield return www.SendWebRequest();
            
            if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
            {
                GameSessionResponse response = JsonUtility.FromJson<GameSessionResponse>(www.downloadHandler.text);
                if (response.success)
                {
                    BeginGame(response.sessionId);
                }
                else
                {
                    ShowMessage("Erro ao criar sessão: " + response.message);
                }
            }
            else
            {
                ShowMessage("Erro de conexão: " + www.error);
            }
        }
    }

    private void BeginGame(string sessionId)
    {
        // Clear previous game
        ClearCards();
        
        // Reset game state
        score = 0;
        matches = 0;
        gameTime = 0f;
        gameActive = true;
        canFlip = true;
        flippedCards.Clear();
        
        // Generate card values (pairs)
        GenerateCardValues();
        
        // Create and position cards
        CreateCards();
        
        // Update UI
        UpdateUI();
        playButton.gameObject.SetActive(false);
        
        // Start game timer
        StartCoroutine(GameTimer());
    }

    private void GenerateCardValues()
    {
        cardValues.Clear();
        int totalCards = gridWidth * gridHeight;
        int pairCount = totalCards / 2;
        
        // Create pairs
        for (int i = 0; i < pairCount; i++)
        {
            cardValues.Add(i);
            cardValues.Add(i);
        }
        
        // Shuffle cards
        ShuffleList(cardValues);
    }

    private void ShuffleList<T>(List<T> list)
    {
        for (int i = 0; i < list.Count; i++)
        {
            T temp = list[i];
            int randomIndex = Random.Range(i, list.Count);
            list[i] = list[randomIndex];
            list[randomIndex] = temp;
        }
    }

    private void CreateCards()
    {
        for (int i = 0; i < cardValues.Count; i++)
        {
            // Calculate position
            int row = i / gridWidth;
            int col = i % gridWidth;
            
            Vector3 position = new Vector3(
                (col - gridWidth / 2f + 0.5f) * cardSpacing,
                (row - gridHeight / 2f + 0.5f) * cardSpacing,
                0
            );
            
            // Create card
            GameObject cardObj = Instantiate(cardPrefab, position, Quaternion.identity, cardsParent);
            Card card = cardObj.GetComponent<Card>();
            
            // Setup card
            card.Initialize(cardValues[i], this);
            cards.Add(card);
        }
    }

    private IEnumerator SubmitGameResult(int finalScore)
    {
        WWWForm form = new WWWForm();
        form.AddField("won", "true");
        form.AddField("score", finalScore.ToString());
        form.AddField("matchedPairs", matches.ToString());
        form.AddField("gameTime", gameTime.ToString());
        
        using (UnityEngine.Networking.UnityWebRequest www = UnityEngine.Networking.UnityWebRequest.Post(apiBaseUrl + "/game/submit-result", form))
        {
            www.SetRequestHeader("Authorization", "Bearer " + authToken);
            
            yield return www.SendWebRequest();
            
            if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
            {
                GameResultResponse response = JsonUtility.FromJson<GameResultResponse>(www.downloadHandler.text);
                ShowGameOver(finalScore, response.winnings);
                GetUserBalance(); // Update balance
            }
            else
            {
                ShowMessage("Erro ao enviar resultado: " + www.error);
            }
        }
    }

    private void ShowGameOver(int finalScore, float winnings)
    {
        finalScoreText.text = $"Pontuação: {finalScore}\nGanhos: R$ {winnings:F2}";
        gameOverPanel.SetActive(true);
        playButton.gameObject.SetActive(true);
    }

    private IEnumerator GetUserBalance()
    {
        using (UnityEngine.Networking.UnityWebRequest www = UnityEngine.Networking.UnityWebRequest.Get(apiBaseUrl + "/user/balance"))
        {
            www.SetRequestHeader("Authorization", "Bearer " + authToken);
            
            yield return www.SendWebRequest();
            
            if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
            {
                BalanceResponse response = JsonUtility.FromJson<BalanceResponse>(www.downloadHandler.text);
                userBalance = response.balance;
                UpdateUI();
            }
        }
    }

    private void UpdateUI()
    {
        scoreText.text = "Pontos: " + score;
        balanceText.text = "Saldo: R$ " + userBalance.ToString("F2");
    }

    private void UpdateTimer()
    {
        int minutes = (int)gameTime / 60;
        int seconds = (int)gameTime % 60;
        timerText.text = string.Format("Tempo: {0:00}:{1:00}", minutes, seconds);
    }

    private void PlaySound(AudioClip clip)
    {
        if (audioSource && clip)
        {
            audioSource.PlayOneShot(clip);
        }
    }

    private void ClearCards()
    {
        foreach (Card card in cards)
        {
            if (card != null)
                DestroyImmediate(card.gameObject);
        }
        cards.Clear();
    }

    private void ShowMessage(string message)
    {
        Debug.Log(message);
        // Implement UI toast or popup
    }

    private IEnumerator GameTimer()
    {
        while (gameActive)
        {
            yield return new WaitForSeconds(1f);
        }
    }

    private string GetAuthTokenFromBrowser()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
            return GetTokenFromJS();
        #else
            return "demo_token";
        #endif
    }

    #if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")]
    private static extern string GetTokenFromJS();
    #endif
}

[System.Serializable]
public class GameSessionResponse
{
    public bool success;
    public string sessionId;
    public string message;
}

[System.Serializable]
public class GameResultResponse
{
    public bool success;
    public float winnings;
    public string message;
}

[System.Serializable]
public class BalanceResponse
{
    public float balance;
}