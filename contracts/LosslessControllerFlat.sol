// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Initializable {

    /**
     * @dev Indicates that the contract has been initialized.
     */
    bool private _initialized;

    /**
     * @dev Indicates that the contract is in the process of being initialized.
     */
    bool private _initializing;

    /**
     * @dev Modifier to protect an initializer function from being invoked twice.
     */
    modifier initializer() {
        require(_initializing || !_initialized, "Initializable: contract is already initialized");

        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) {
            _initializing = true;
            _initialized = true;
        }

        _;

        if (isTopLevelCall) {
            _initializing = false;
        }
    }
}

abstract contract ContextUpgradeable is Initializable {
    function __Context_init() internal initializer {
        __Context_init_unchained();
    }

    function __Context_init_unchained() internal initializer {
    }
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
    uint256[50] private __gap;
}

abstract contract PausableUpgradeable is Initializable, ContextUpgradeable {
    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    bool private _paused;

    /**
     * @dev Initializes the contract in unpaused state.
     */
    function __Pausable_init() internal initializer {
        __Context_init_unchained();
        __Pausable_init_unchained();
    }

    function __Pausable_init_unchained() internal initializer {
        _paused = false;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
    uint256[49] private __gap;
}


interface ILERC20 {
    function transferOutBlacklistedFunds(address[] calldata from) external;
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// TODO: pausable
contract LosslessControllerFlat is Initializable, ContextUpgradeable, PausableUpgradeable {
    address public pauseAdmin;
    address public admin;
    address public recoveryAdmin;
    
    struct Blacklist {
        mapping(address => uint256) blacklist;
    }

    struct RemoveFromBlacklistProposal {
        bool confirmedByTokenAdmin;
        bool confirmedByLosslessAdmin;
    }

    struct RemoveFromBlacklistProposalsList {
        mapping(address => RemoveFromBlacklistProposal) list;
    }

    struct Freezelist {
        mapping(address => uint256) freezelist;
    }

    struct IdoConfig {
        bool confirmed;
        uint256 startTime;
        uint256 duration;
        address[] whitelist;
    }

    struct TokensTransferProposal {
        bool confirmedByTokenAdmin;
        bool confirmedByLosslessAdmin;
        address proposedAddress;
    }

    mapping(address => Freezelist) tokensFreezelist;
    mapping(address => Blacklist) tokensBlacklists;
    mapping(address => IdoConfig) tokensIdoConfig;
    mapping(address => RemoveFromBlacklistProposalsList) tokensBlacklistRemoveProposals;
    mapping(address => TokensTransferProposal) tokensTransfersPorposals;
    mapping(address => bool) idoProposals;
    mapping(address => address) tokenAdmins;

    uint256 BLACKLIST_DISPUTE_TIME;

    event TokenRegistered(address indexed token, address indexed admin);
    event CooldownSet(address indexed token, address indexed admin, uint256 cooldown);
    event AddressesBlacklisted(address indexed token, address indexed admin, address[] addressesToBlacklist);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event RecoveryAdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event IDOProposed(address indexed tokenAddress, uint256 duration);
    event IDOConfirmed(address indexed tokenAddress);
    event BlacklistedAddressesProposedRemovalTokenAdmin(address indexed tokenAddress, address[] proposedAddreses);
    event BlacklistedAddressesProposedRemovalLosslessAdmin(address indexed tokenAddress, address[] proposedAddreses);
    event BlacklistedFundsTransferedOut(address indexed tokenAddress, address indexed adminAddress, address[] blacklistedAddresses);
    event TransferProposedByTokenAdmin(address indexed tokenAddress, address indexed adminAddress, address indexed proposedAddress);
    event TransferProposedByLosslessAdmin(address indexed tokenAddress, address indexed adminAddress, address indexed proposedAddress);
    event FundsTransfered(address indexed tokenAddress, address indexed adminAddress, address indexed proposedAddress, uint256 amount);
    // --- MODIFIERS ---

    // TODO: update
    modifier onlyRegisteredToken {
        require(
            tokenAdmins[_msgSender()] != address(0),
            "LOSSLESS: Token should be registered in registry"
        );
        _;
    }

    // TODO: update
    modifier onlyAdmin (address tokenAddress) {
        require(
            tokenAdmins[tokenAddress] == _msgSender() || admin == _msgSender(),
            "LOSSLESS: Sender is not admin"
        );
        _;
    }

    modifier onlyRecoveryAdmin() {
        require(_msgSender() == recoveryAdmin, "LOSSLESS: Sender must be recovery admin");
        _;
    }

    modifier onlyTokenAdmin(address tokenAddress) {
        require(
            tokenAdmins[tokenAddress] == _msgSender(),
            "LOSSLESS: Sender must be token admin"
        );
        _;
    }

    modifier onlyLosslessAdmin() {
        require(
            admin == _msgSender(),
            "LOSSLESS: Sender must be lossless admin"
        );
        _;
    }

    // --- INITIALIZER ---

    function initialize(address _admin, address _recoveryAdmin, address _pauseAdmin) public initializer {
        admin = _admin;
        recoveryAdmin = _recoveryAdmin;
        pauseAdmin = _pauseAdmin;
        BLACKLIST_DISPUTE_TIME =  7 days;
    }

    // --- GETTERS ---
    function getTokenAdmin(address tokenAddress) public view returns (address) {
        return tokenAdmins[tokenAddress];
    }

    function getIsBlacklisted(address tokenAddress, address _address) public view returns (bool) {
        return tokensBlacklists[tokenAddress].blacklist[_address] > 0;
    }

    function getIsIdoConfirmed(address tokenAddress) public view returns (bool) {
        return tokensIdoConfig[tokenAddress].confirmed;
    }

    function getIdoStartTime(address tokenAddress) public view returns (uint256) {
        return tokensIdoConfig[tokenAddress].startTime;
    }

    function getIdoDuration(address tokenAddress) public view returns (uint256) {
        return tokensIdoConfig[tokenAddress].duration;
    }

    function getIdoWhitelist(address tokenAddress) public view returns (address[] memory) {
        return tokensIdoConfig[tokenAddress].whitelist;
    }

    function getRemovalProposedByTokenAdmin(address tokenAddress, address proposedAddress) public view returns (bool) {
        return tokensBlacklistRemoveProposals[tokenAddress].list[proposedAddress].confirmedByTokenAdmin;
    }

    function getRemovalProposedByLosslessAdmin(address tokenAddress, address proposedAddress) public view returns (bool) {
        return tokensBlacklistRemoveProposals[tokenAddress].list[proposedAddress].confirmedByLosslessAdmin;
    }

    function getTransferProposedByTokenAdmin(address tokenAddress) public view returns (bool) {
        return tokensTransfersPorposals[tokenAddress].confirmedByTokenAdmin;
    }

    function getTransferProposedByLosslessAdmin(address tokenAddress) public view returns (bool) {
        return tokensTransfersPorposals[tokenAddress].confirmedByLosslessAdmin;
    }

    function getTransferProposedAddress(address tokenAddress) public view returns (address) {
        return tokensTransfersPorposals[tokenAddress].proposedAddress;
    }

    function getVersion() public pure returns (uint256) {
        return 1;
    }
 
    // --- SETTERS ---

    function pause() public {
        require(_msgSender() == pauseAdmin, "LOSSLESS: Sender must be pauseAdmin");
        _pause();
    }    
    
    function unpause() public {
        require(_msgSender() == pauseAdmin, "LOSSLESS: Sender must be pauseAdmin");
        _unpause();
    }

    function setAdmin(address newAdmin) public onlyRecoveryAdmin whenNotPaused {
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    function setRecoveryAdmin(address newRecoveryAdmin) public onlyRecoveryAdmin whenNotPaused {
        emit RecoveryAdminChanged(recoveryAdmin, newRecoveryAdmin);
        recoveryAdmin = newRecoveryAdmin;
    }

    function setTokenAdmin(address _admin) public {
        tokenAdmins[_msgSender()] = _admin;
        emit TokenRegistered(_msgSender(), _admin);
    }

    function blacklistAddresses(address tokenAddress, address[] calldata addressesToBlacklist) public onlyAdmin(tokenAddress) whenNotPaused {
        require(tokensIdoConfig[tokenAddress].startTime != 0, "LOSSLESS: IDO has not started yet");
        require(tokensIdoConfig[tokenAddress].startTime + tokensIdoConfig[tokenAddress].duration > block.timestamp, "LOSSLESS: IDO has ended");
        require(addressesToBlacklist.length > 0, "LOSSLESS: Blacklist can not be empty");
        for (uint i = 0; i < addressesToBlacklist.length; i++) {
            require(addressesToBlacklist[i] != address(this), "LOSSLESS: Can not blacklist lossless contract");
            tokensBlacklists[tokenAddress].blacklist[addressesToBlacklist[i]] = block.timestamp;
        }
        emit AddressesBlacklisted(tokenAddress, _msgSender(), addressesToBlacklist);
    }

    function proposeIdoConfig(address tokenAddress, uint256 duration, address[] calldata whitelist) public onlyTokenAdmin(tokenAddress)  whenNotPaused{
        require(duration != 0, "LOSSLESS: Duration cannot be 0");
        require(duration <= 1 hours, "LOSSLESS: Duration cannot be more than one hour");
        require(whitelist.length > 0, "LOSSLESS: Whitelist cannot be empty");
        IdoConfig storage idoConfig = tokensIdoConfig[tokenAddress];
        require(idoConfig.startTime == 0, "LOSSLESS: IDO already started");
        idoConfig.confirmed = false;
        idoConfig.duration = duration;
        idoConfig.whitelist = whitelist;
        emit IDOProposed(tokenAddress, duration);
    }

    function setIdoConfigConfirm(address tokenAddress, bool value) public onlyLosslessAdmin whenNotPaused {
        IdoConfig storage idoConfig = tokensIdoConfig[tokenAddress];
        require(idoConfig.duration != 0, "LOSSLESS: IDO config is not proposed");
        require(idoConfig.startTime == 0, "LOSSLESS: IDO already started");
        idoConfig.confirmed = value;
        emit IDOConfirmed(tokenAddress);
    }

    function startIdo(address tokenAddress) public onlyTokenAdmin(tokenAddress) whenNotPaused {
        IdoConfig storage idoConfig = tokensIdoConfig[tokenAddress];
        require(idoConfig.confirmed, "LOSSLESS: IDO config is not confirmed");
        require(idoConfig.startTime == 0, "LOSSLESS: IDO already started");
        idoConfig.startTime = block.timestamp;
    }

    function removeFromBlacklistByTokenAdmin(address tokenAddress, address[] memory addressesToRemove) public onlyTokenAdmin(tokenAddress) whenNotPaused {
        for(uint i = 0; i < addressesToRemove.length; i++) {
            RemoveFromBlacklistProposal storage proposal =  tokensBlacklistRemoveProposals[tokenAddress].list[addressesToRemove[i]];
            if (proposal.confirmedByLosslessAdmin) {
                tokensBlacklists[tokenAddress].blacklist[addressesToRemove[i]] = 0;
                delete tokensBlacklistRemoveProposals[tokenAddress].list[addressesToRemove[i]];
            } else {
                proposal.confirmedByTokenAdmin = true;
            }
        }

        emit BlacklistedAddressesProposedRemovalTokenAdmin(tokenAddress, addressesToRemove);
    }

    function removeFromBlacklistByLosslessAdmin(address tokenAddress, address[] memory addressesToRemove) public onlyLosslessAdmin whenNotPaused {
        for(uint i = 0; i < addressesToRemove.length; i++) {
            RemoveFromBlacklistProposal storage proposal =  tokensBlacklistRemoveProposals[tokenAddress].list[addressesToRemove[i]];
            if (proposal.confirmedByTokenAdmin) {
                tokensBlacklists[tokenAddress].blacklist[addressesToRemove[i]] = 0;
                delete tokensBlacklistRemoveProposals[tokenAddress].list[addressesToRemove[i]];
            } else {
                proposal.confirmedByLosslessAdmin = true;
            }
        }

        emit BlacklistedAddressesProposedRemovalLosslessAdmin(tokenAddress, addressesToRemove);
    }

    function transferTokensByTokenAdmin(address tokenAddress, address proposedAddress) public onlyTokenAdmin(tokenAddress) whenNotPaused {
        TokensTransferProposal storage proposal = tokensTransfersPorposals[tokenAddress];
        if (proposal.confirmedByLosslessAdmin && proposal.proposedAddress == proposedAddress) {
            proposal.confirmedByLosslessAdmin = false;
            proposal.confirmedByTokenAdmin = false;
            proposal.proposedAddress = address(0);
            uint256 balance = ILERC20(tokenAddress).balanceOf(address(this));
            require(ILERC20(tokenAddress).transfer(proposedAddress, balance));
            emit FundsTransfered(tokenAddress, _msgSender(), proposedAddress, balance);
        } else {
            proposal.confirmedByTokenAdmin = true;
            proposal.confirmedByLosslessAdmin = false;
            proposal.proposedAddress = proposedAddress;
            emit TransferProposedByTokenAdmin(tokenAddress, _msgSender(), proposedAddress);
        }
    }

    function transferTokensByLosslessAdmin(address tokenAddress, address proposedAddress) public onlyLosslessAdmin whenNotPaused {
        TokensTransferProposal storage proposal = tokensTransfersPorposals[tokenAddress];
        if (proposal.confirmedByTokenAdmin && proposal.proposedAddress == proposedAddress) {
            proposal.confirmedByLosslessAdmin = false;
            proposal.confirmedByTokenAdmin = false;
            proposal.proposedAddress = address(0);
            uint256 balance = ILERC20(tokenAddress).balanceOf(address(this));
            require(ILERC20(tokenAddress).transfer(proposedAddress, balance));
            emit FundsTransfered(tokenAddress, _msgSender(), proposedAddress, balance);
        } else {
            proposal.confirmedByLosslessAdmin = true;
            proposal.confirmedByTokenAdmin = false;
            proposal.proposedAddress = proposedAddress;
            emit TransferProposedByLosslessAdmin(tokenAddress, _msgSender(), proposedAddress);
        }
    }


    function addCooldown(address recipient) private {
        IdoConfig memory conf = tokensIdoConfig[_msgSender()];
        if (conf.startTime > 0 && conf.startTime + conf.duration > block.timestamp) {
            bool isWhitelisted = false;
            for (uint i = 0; i < conf.whitelist.length; i++) {
                if (conf.whitelist[i] == recipient) {
                    isWhitelisted = true;
                }
            }
            if (!isWhitelisted) {
                tokensFreezelist[_msgSender()].freezelist[recipient] = conf.startTime + conf.duration;
            }
        }
    }

    function transferOutBlacklistedFunds(address tokenAddress, address[] calldata blacklistedAddresses) public onlyAdmin(tokenAddress) {
        require(blacklistedAddresses.length > 0, "LOSSLESS: blacklisted addresses must not be empty");
        for (uint i = 0; i < blacklistedAddresses.length; i++) {
            require(tokensBlacklists[tokenAddress].blacklist[blacklistedAddresses[i]] > 0, "LOSSLESS: some addresses are not blacklisted");
            require(tokensBlacklists[tokenAddress].blacklist[blacklistedAddresses[i]] + BLACKLIST_DISPUTE_TIME < block.timestamp, "LOSSLESS: some addresses still can be disputed");
        }

        ILERC20(tokenAddress).transferOutBlacklistedFunds(blacklistedAddresses);
        emit BlacklistedFundsTransferedOut(tokenAddress, _msgSender(), blacklistedAddresses);
    }

    // --- BEFORE HOOKS ---

    function beforeTransfer(address sender, address recipient, uint256 amount) public view {
        uint256 blacklistedAt = tokensBlacklists[_msgSender()].blacklist[sender];
        bool isStopped = false;
        if (blacklistedAt > 0) {
            isStopped = true;
        }

        uint256 freezedUntil = tokensFreezelist[_msgSender()].freezelist[sender];
        if (freezedUntil > block.timestamp) {
            isStopped = true;
        }
        
        require(!isStopped, "LOSSLESS: Operation not allowed");
    }

    function beforeTransferFrom(address msgSender, address sender, address recipient, uint256 amount) public view {
        uint256 senderBlacklistedAt= tokensBlacklists[_msgSender()].blacklist[sender];
        uint256 msgSenderBlacklistedAt= tokensBlacklists[_msgSender()].blacklist[msgSender];
        bool isStopped = false;
        if (senderBlacklistedAt > 0 || msgSenderBlacklistedAt > 0) {
            isStopped = true;
        }

        uint256 senderFreezedUntil = tokensFreezelist[_msgSender()].freezelist[sender];
        uint256 msgSenderFreezedUntil = tokensFreezelist[_msgSender()].freezelist[msgSender];
        if (senderFreezedUntil > block.timestamp || msgSenderFreezedUntil > block.timestamp) {
            isStopped = true;
        }
        
        require(!isStopped, "LOSSLESS: Operation not allowed");
    }

    function beforeApprove(address sender, address spender, uint256 amount) public {}

    function beforeIncreaseAllowance(address msgSender, address spender, uint256 addedValue) public {}

    function beforeDecreaseAllowance(address msgSender, address spender, uint256 subtractedValue) public {}

    // --- AFTER HOOKS ---

    function afterApprove(address sender, address spender, uint256 amount) public {}

    function afterTransfer(address sender, address recipient, uint256 amount) public {
        addCooldown(recipient);
    }

    function afterTransferFrom(address msgSender, address sender, address recipient, uint256 amount) public {
        addCooldown(recipient);
    }

    function afterIncreaseAllowance(address sender, address spender, uint256 addedValue) public {}

    function afterDecreaseAllowance(address sender, address spender, uint256 subtractedValue) public {}
}